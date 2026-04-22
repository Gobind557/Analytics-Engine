# Unified Event Analytics Engine

Express + TypeScript backend for high-volume event ingestion, pre-aggregated analytics queries, secure API-key auth, Redis-backed analytics caching, and per-key throttling.

## Architecture Overview

The codebase is organized by responsibility and by backend layer:

- `src/modules/auth`: app registration, API key lifecycle, and `x-api-key` authentication
- `src/modules/events`: single and batch ingestion plus aggregate maintenance
- `src/modules/analytics`: summary queries, caching, and query-layer DTOs
- `src/common`: shared middleware, errors, and utilities
- `src/prisma`: Prisma client bootstrap
- `src/config`: environment parsing and Swagger setup
- `src/redis`: Redis client bootstrap

Each module keeps controllers for HTTP handling, services for business logic, and repositories for database access. That keeps query-heavy logic isolated and makes it easier to swap internals later for queues, partitioning, or background jobs.

## Local Run

1. Copy `.env.example` to `.env`
2. Start infrastructure: `docker compose up --build`
3. Open Swagger: `http://localhost:3000/docs`

Useful commands:

- `npm run dev`
- `npm run build`
- `npm test`
- `npm run test:integration`
- `npx prisma migrate deploy`

## API Surface

Auth endpoints:

- `POST /api/auth/register`
- `GET /api/auth/api-key`
- `POST /api/auth/revoke`
- `POST /api/auth/regenerate`

Analytics endpoints:

- `POST /api/analytics/collect`
- `POST /api/analytics/collect/batch`
- `GET /api/analytics/event-summary`
- `GET /api/analytics/time-series`
- `GET /api/analytics/app-summary`
- `GET /api/analytics/user-stats`

Protected endpoints require `x-api-key`.

## Database Schema Explanation

### `apps`

Represents a customer-owned analytics app. `owner_id` is the mocked Google identity for v1 and scopes key-management operations.

### `api_keys`

Stores hashed API keys only. The raw key is returned once at registration or regeneration time and is never persisted. `revoked` and `expires_at` are checked on every protected request.

### `events`

Raw source of truth for ingestion. This table preserves full event payloads, including optional `user_id`, raw `device`, normalized `device_type`, and flexible `metadata` via `JSONB`.

### `daily_event_stats`

Pre-aggregated daily rollups keyed by `(app_id, event_name, date)`. It stores:

- total count
- summed unique users per day
- mobile count
- desktop count

This table is what makes event summaries and time-series queries cheap at read time.

## Indexing Decisions

Required query-path indexes:

- `events(event_name, timestamp)`: supports event-specific filtered scans over time
- `events(app_id, timestamp)`: supports app-scoped ingestion lookups and time-bounded reads
- `events(user_id)`: supports user-level analytics lookups
- `events(timestamp)`: supports generic time filtering

Additional practical index:

- `events(app_id, user_id, timestamp)`: improves user stats for one app/user over time

Aggregate-table indexes:

- unique `(app_id, event_name, date)` on `daily_event_stats`: guarantees safe upserts
- `daily_event_stats(app_id, date)` and `daily_event_stats(event_name, date)`: supports range summaries and grouped time-series reads

## Pre-Aggregation Strategy

Ingestion writes raw rows to `events` and then refreshes only the touched `(app_id, event_name, date)` keys in `daily_event_stats`.

Why this shape:

- write path stays synchronous and easy to reason about
- batch aggregate refresh uses one grouped query for all touched keys instead of one scan per key
- reads for summaries avoid expensive scans over raw events
- `unique_users` remains exact for each affected day because the aggregate is recomputed from the authoritative raw rows for that slice only
- mobile vs desktop counts are based on normalized ingestion-time classification instead of runtime SQL pattern matching

This is a good v1 tradeoff before moving to background jobs or stream processors.

## Caching Strategy

Read-heavy analytics endpoints are cached:

- `GET /api/analytics/event-summary`
- `GET /api/analytics/time-series`
- `GET /api/analytics/app-summary`
- `GET /api/analytics/user-stats`

- key format: `analytics:{endpoint}:{appId}:...`
- TTL: `EVENT_SUMMARY_CACHE_TTL_SECONDS` with a default of `300`
- invalidation: new ingestion deletes all cached analytics views for the affected `appId`

This keeps repeated dashboard reads cheap while avoiding stale time-series, app-summary, or user-level responses after ingestion.

## Rate Limiting Approach

Protected analytics endpoints use Redis-backed counters keyed by API key id:

- limit: `100 requests/minute` by default
- scope: per API key
- headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

If Redis is temporarily unavailable, requests fail open instead of blocking ingestion and analytics traffic.

## API Key Security Design

- raw keys are generated with cryptographic randomness
- only SHA-256 hashes are stored
- every request validates presence, revocation status, and expiration
- regeneration revokes active keys and issues a new raw key once

This keeps storage safe even if the database is exposed and avoids accidental re-display of secrets.

## Query Design Notes

The query layer intentionally pushes filters into `WHERE` before aggregation:

- event summary reads `daily_event_stats` with `app_id`, `event_name`, and date bounds applied first
- time-series groups only the filtered aggregate rows
- app summary uses aggregate rows for totals and top events, but uses raw events for exact active-user counts and a paginated recent-events feed
- user stats read from raw `events` because per-user recent activity needs unaggregated detail, with pagination applied to the recent-events list

## Testing

Unit coverage includes:

- API key generation and hashing
- DTO validation
- cache key generation

Integration coverage includes:

- app registration and ingestion flow
- batch rejection semantics
- cached summary invalidation
- app/time-series/user analytics queries
- per-key rate limiting



## Tradeoffs and Future Evolution

Why Postgres:

- strong transactional guarantees for synchronous ingestion
- rich indexing and aggregation support
- JSONB for flexible metadata without a second data store

Why JSONB for `metadata`:

- preserves flexible event payloads without schema churn
- lets the system evolve before committing to specialized columns

Why synchronous ingestion in v1:

- simpler correctness model
- lower operational overhead
- easier local development and debugging

Natural next steps:

- queue-based ingestion for burst smoothing
- partitioned `events` tables by time or app
- horizontal app scaling behind a load balancer
- background aggregate refresh or streaming consumers

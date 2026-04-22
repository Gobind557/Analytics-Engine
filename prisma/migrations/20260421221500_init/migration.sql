-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "apps" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL,
    "app_id" UUID NOT NULL,
    "key_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "app_id" UUID NOT NULL,
    "event_name" TEXT NOT NULL,
    "user_id" TEXT,
    "timestamp" TIMESTAMP(6) NOT NULL,
    "device" TEXT NOT NULL,
    "referrer" TEXT,
    "url" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_event_stats" (
    "id" UUID NOT NULL,
    "app_id" UUID NOT NULL,
    "event_name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL,
    "unique_users" INTEGER NOT NULL,
    "mobile_count" INTEGER NOT NULL,
    "desktop_count" INTEGER NOT NULL,

    CONSTRAINT "daily_event_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_apps_owner_id" ON "apps"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "idx_api_keys_app_id_revoked" ON "api_keys"("app_id", "revoked");

-- CreateIndex
CREATE INDEX "idx_events_event_name_timestamp" ON "events"("event_name", "timestamp");

-- CreateIndex
CREATE INDEX "idx_events_app_id_timestamp" ON "events"("app_id", "timestamp");

-- CreateIndex
CREATE INDEX "idx_events_user_id" ON "events"("user_id");

-- CreateIndex
CREATE INDEX "idx_events_timestamp" ON "events"("timestamp");

-- CreateIndex
CREATE INDEX "idx_events_app_id_user_id_timestamp" ON "events"("app_id", "user_id", "timestamp");

-- CreateIndex
CREATE INDEX "idx_daily_event_stats_app_id_date" ON "daily_event_stats"("app_id", "date");

-- CreateIndex
CREATE INDEX "idx_daily_event_stats_event_name_date" ON "daily_event_stats"("event_name", "date");

-- CreateIndex
CREATE UNIQUE INDEX "uq_daily_event_stats_app_event_date" ON "daily_event_stats"("app_id", "event_name", "date");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_event_stats" ADD CONSTRAINT "daily_event_stats_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

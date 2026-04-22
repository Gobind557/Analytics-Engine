import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Unified Event Analytics Engine',
    version: '1.0.0',
    description:
      'Analytics ingestion and aggregation API with secure API keys, targeted caching, and per-key rate limiting.'
  },
  servers: [
    {
      url: 'http://localhost:3000'
    }
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key'
      }
    },
    schemas: {
      RegisterAppRequest: {
        type: 'object',
        required: ['name', 'ownerId'],
        properties: {
          name: { type: 'string', example: 'Storefront App' },
          ownerId: { type: 'string', example: 'google-user-123' }
        }
      },
      ApiKeyResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          appId: { type: 'string', format: 'uuid' },
          expiresAt: { type: 'string', format: 'date-time' },
          revoked: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      EventPayload: {
        type: 'object',
        required: ['eventName', 'timestamp', 'device', 'url', 'ipAddress'],
        properties: {
          eventName: { type: 'string', example: 'page_view' },
          userId: { type: 'string', example: 'user-1', nullable: true },
          timestamp: { type: 'string', format: 'date-time' },
          device: { type: 'string', example: 'mobile safari' },
          referrer: { type: 'string', example: 'https://google.com', nullable: true },
          url: { type: 'string', example: 'https://example.com/pricing' },
          ipAddress: { type: 'string', example: '127.0.0.1' },
          metadata: { type: 'object', additionalProperties: true, nullable: true }
        }
      },
      BatchEventPayload: {
        type: 'object',
        required: ['events'],
        properties: {
          events: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/EventPayload'
            }
          }
        }
      }
    }
  },
  paths: {
    '/api/health': {
      get: {
        summary: 'Health check',
        responses: {
          '200': {
            description: 'Application is healthy'
          }
        }
      }
    },
    '/api/auth/register': {
      post: {
        summary: 'Register an app and issue the initial API key',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterAppRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'App registered'
          }
        }
      }
    },
    '/api/auth/api-key': {
      get: {
        summary: 'List API keys for an app owner',
        parameters: [
          { name: 'appId', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'ownerId', in: 'query', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': {
            description: 'API key metadata list'
          }
        }
      }
    },
    '/api/auth/revoke': {
      post: {
        summary: 'Revoke an API key',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['appId', 'ownerId', 'keyId'],
                properties: {
                  appId: { type: 'string', format: 'uuid' },
                  ownerId: { type: 'string' },
                  keyId: { type: 'string', format: 'uuid' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'API key revoked'
          }
        }
      }
    },
    '/api/auth/regenerate': {
      post: {
        summary: 'Revoke active keys and issue a new API key',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['appId', 'ownerId'],
                properties: {
                  appId: { type: 'string', format: 'uuid' },
                  ownerId: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'API key regenerated'
          }
        }
      }
    },
    '/api/analytics/collect': {
      post: {
        summary: 'Ingest a single event',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EventPayload' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Event ingested'
          }
        }
      }
    },
    '/api/analytics/collect/batch': {
      post: {
        summary: 'Ingest a batch of events',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BatchEventPayload' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Batch ingested'
          }
        }
      }
    },
    '/api/analytics/event-summary': {
      get: {
        summary: 'Get pre-aggregated counts for one event',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'eventName', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'startDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } }
        ],
        responses: {
          '200': {
            description: 'Event summary returned'
          }
        }
      }
    },
    '/api/analytics/time-series': {
      get: {
        summary: 'Get event counts grouped by date',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'startDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'eventName', in: 'query', required: false, schema: { type: 'string' } }
        ],
        responses: {
          '200': {
            description: 'Time series returned'
          }
        }
      }
    },
    '/api/analytics/app-summary': {
      get: {
        summary: 'Get app-level metrics, top events, and paginated recent events',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'startDate', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
          { name: 'recentEventsPage', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          {
            name: 'recentEventsPageSize',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 10, maximum: 50 }
          }
        ],
        responses: {
          '200': {
            description: 'App summary returned'
          }
        }
      }
    },
    '/api/analytics/user-stats': {
      get: {
        summary: 'Get user-level event and normalized device statistics with paginated recent events',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'userId', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', required: false, schema: { type: 'integer', default: 10, maximum: 50 } },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 10, maximum: 50 },
            description: 'Backward-compatible alias for pageSize'
          }
        ],
        responses: {
          '200': {
            description: 'User stats returned'
          }
        }
      }
    }
  }
};

export function configureSwagger(app: Express): void {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
}

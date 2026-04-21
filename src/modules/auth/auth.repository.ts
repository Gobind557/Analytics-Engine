import { ApiKey, App } from '@prisma/client';
import { prisma } from '../../prisma/prisma-client';

export class AuthRepository {
  createAppWithKey(params: {
    appName: string;
    ownerId: string;
    keyHash: string;
    expiresAt: Date;
  }): Promise<{ app: App; apiKey: ApiKey }> {
    return prisma.$transaction(async (tx) => {
      const app = await tx.app.create({
        data: {
          name: params.appName,
          ownerId: params.ownerId
        }
      });

      const apiKey = await tx.apiKey.create({
        data: {
          appId: app.id,
          keyHash: params.keyHash,
          expiresAt: params.expiresAt
        }
      });

      return { app, apiKey };
    });
  }

  findAppByOwner(appId: string, ownerId: string): Promise<App | null> {
    return prisma.app.findFirst({
      where: {
        id: appId,
        ownerId
      }
    });
  }

  listApiKeys(appId: string): Promise<ApiKey[]> {
    return prisma.apiKey.findMany({
      where: {
        appId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  findApiKey(appId: string, keyId: string): Promise<ApiKey | null> {
    return prisma.apiKey.findFirst({
      where: {
        id: keyId,
        appId
      }
    });
  }

  revokeApiKey(keyId: string): Promise<ApiKey> {
    return prisma.apiKey.update({
      where: {
        id: keyId
      },
      data: {
        revoked: true
      }
    });
  }

  revokeActiveApiKeys(appId: string) {
    return prisma.apiKey.updateMany({
      where: {
        appId,
        revoked: false
      },
      data: {
        revoked: true
      }
    });
  }

  createApiKey(appId: string, keyHash: string, expiresAt: Date): Promise<ApiKey> {
    return prisma.apiKey.create({
      data: {
        appId,
        keyHash,
        expiresAt
      }
    });
  }

  findApiKeyByHash(keyHash: string) {
    return prisma.apiKey.findUnique({
      where: {
        keyHash
      },
      include: {
        app: true
      }
    });
  }
}

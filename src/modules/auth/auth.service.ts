import { ApiKey } from '@prisma/client';
import { env } from '../../config/env';
import { ApiError } from '../../common/errors/api-error';
import { generateRawApiKey, hashApiKey } from '../../common/utils/api-key';
import {
  ListApiKeysInput,
  RegisterAppInput,
  RegenerateApiKeyInput,
  RevokeApiKeyInput
} from './auth.schema';
import { AuthRepository } from './auth.repository';

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  async registerApp(input: RegisterAppInput) {
    const rawApiKey = generateRawApiKey();
    const { app, apiKey } = await this.authRepository.createAppWithKey({
      appName: input.name,
      ownerId: input.ownerId,
      keyHash: hashApiKey(rawApiKey),
      expiresAt: this.computeExpiryDate()
    });

    return {
      app,
      apiKey: this.toApiKeyResponse(apiKey),
      rawApiKey
    };
  }

  async listApiKeys(input: ListApiKeysInput) {
    await this.assertAppOwnership(input.appId, input.ownerId);
    const apiKeys = await this.authRepository.listApiKeys(input.appId);
    return apiKeys.map((apiKey) => this.toApiKeyResponse(apiKey));
  }

  async revokeApiKey(input: RevokeApiKeyInput) {
    await this.assertAppOwnership(input.appId, input.ownerId);
    const apiKey = await this.authRepository.findApiKey(input.appId, input.keyId);

    if (!apiKey) {
      throw ApiError.notFound('API key not found for this app');
    }

    if (apiKey.revoked) {
      return this.toApiKeyResponse(apiKey);
    }

    const revokedKey = await this.authRepository.revokeApiKey(apiKey.id);
    return this.toApiKeyResponse(revokedKey);
  }

  async regenerateApiKey(input: RegenerateApiKeyInput) {
    await this.assertAppOwnership(input.appId, input.ownerId);

    const rawApiKey = generateRawApiKey();
    await this.authRepository.revokeActiveApiKeys(input.appId);
    const apiKey = await this.authRepository.createApiKey(
      input.appId,
      hashApiKey(rawApiKey),
      this.computeExpiryDate()
    );

    return {
      apiKey: this.toApiKeyResponse(apiKey),
      rawApiKey
    };
  }

  async validateApiKey(rawApiKey: string) {
    const apiKeyRecord = await this.authRepository.findApiKeyByHash(hashApiKey(rawApiKey));

    if (!apiKeyRecord) {
      throw ApiError.unauthorized('Invalid API key');
    }

    if (apiKeyRecord.revoked) {
      throw ApiError.unauthorized('API key has been revoked');
    }

    if (apiKeyRecord.expiresAt.getTime() < Date.now()) {
      throw ApiError.unauthorized('API key has expired');
    }

    return {
      apiKeyId: apiKeyRecord.id,
      appId: apiKeyRecord.appId,
      appName: apiKeyRecord.app.name
    };
  }

  private async assertAppOwnership(appId: string, ownerId: string) {
    const app = await this.authRepository.findAppByOwner(appId, ownerId);

    if (!app) {
      throw ApiError.notFound('App not found for owner');
    }

    return app;
  }

  private computeExpiryDate(): Date {
    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + env.API_KEY_TTL_DAYS);
    return expiresAt;
  }

  private toApiKeyResponse(apiKey: ApiKey) {
    return {
      id: apiKey.id,
      appId: apiKey.appId,
      expiresAt: apiKey.expiresAt,
      revoked: apiKey.revoked,
      createdAt: apiKey.createdAt
    };
  }
}

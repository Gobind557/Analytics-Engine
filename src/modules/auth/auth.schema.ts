import { z } from 'zod';

export const registerAppSchema = z.object({
  name: z.string().trim().min(1).max(120),
  ownerId: z.string().trim().min(1).max(255)
});

export const listApiKeysSchema = z.object({
  appId: z.string().uuid(),
  ownerId: z.string().trim().min(1).max(255)
});

export const revokeApiKeySchema = z.object({
  appId: z.string().uuid(),
  ownerId: z.string().trim().min(1).max(255),
  keyId: z.string().uuid()
});

export const regenerateApiKeySchema = z.object({
  appId: z.string().uuid(),
  ownerId: z.string().trim().min(1).max(255)
});

export type RegisterAppInput = z.infer<typeof registerAppSchema>;
export type ListApiKeysInput = z.infer<typeof listApiKeysSchema>;
export type RevokeApiKeyInput = z.infer<typeof revokeApiKeySchema>;
export type RegenerateApiKeyInput = z.infer<typeof regenerateApiKeySchema>;

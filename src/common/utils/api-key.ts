import crypto from 'node:crypto';

export function generateRawApiKey(): string {
  return `uae_${crypto.randomBytes(24).toString('hex')}`;
}

export function hashApiKey(rawApiKey: string): string {
  return crypto.createHash('sha256').update(rawApiKey).digest('hex');
}

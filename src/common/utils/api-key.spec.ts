import { generateRawApiKey, hashApiKey } from './api-key';

describe('api-key utils', () => {
  it('generates raw api keys with the expected prefix', () => {
    expect(generateRawApiKey()).toMatch(/^uae_[a-f0-9]{48}$/);
  });

  it('hashes the same key consistently', () => {
    const rawApiKey = 'uae_example';

    expect(hashApiKey(rawApiKey)).toHaveLength(64);
    expect(hashApiKey(rawApiKey)).toBe(hashApiKey(rawApiKey));
  });
});

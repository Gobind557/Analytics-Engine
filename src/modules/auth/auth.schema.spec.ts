import { listApiKeysSchema, registerAppSchema, revokeApiKeySchema } from './auth.schema';

describe('auth schema validation', () => {
  it('accepts valid register payloads', () => {
    const parsed = registerAppSchema.parse({
      name: 'Demo App',
      ownerId: 'google-oauth-user'
    });

    expect(parsed.name).toBe('Demo App');
  });

  it('rejects invalid list api key queries', () => {
    expect(() =>
      listApiKeysSchema.parse({
        appId: 'not-a-uuid',
        ownerId: ''
      })
    ).toThrow();
  });

  it('requires a valid key id when revoking', () => {
    expect(() =>
      revokeApiKeySchema.parse({
        appId: '22222222-2222-2222-2222-222222222222',
        ownerId: 'owner',
        keyId: 'bad-id'
      })
    ).toThrow();
  });
});

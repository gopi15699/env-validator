import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('AWS Secrets Manager plugin', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('loads and maps secrets from AWS', async () => {
    // Mock the AWS SDK
    vi.doMock('@aws-sdk/client-secrets-manager', () => ({
      SecretsManagerClient: vi.fn().mockImplementation(() => ({
        send: vi.fn().mockResolvedValue({
          SecretString: JSON.stringify({ db_password: 'secret123', api_key: 'key456' }),
        }),
      })),
      GetSecretValueCommand: vi.fn(),
    }));

    const { awsSecretsPlugin } = await import('../../src/plugins/aws-secrets');
    const plugin = awsSecretsPlugin({
      secretId: 'my-app/prod',
      region:   'us-east-1',
      keyMapping: { db_password: 'DB_PASSWORD', api_key: 'API_KEY' },
    });

    const result = await plugin.load();
    expect(result['DB_PASSWORD']).toBe('secret123');
    expect(result['API_KEY']).toBe('key456');
  });

  it('throws when @aws-sdk/client-secrets-manager is not installed', async () => {
    vi.doMock('@aws-sdk/client-secrets-manager', () => {
      throw new Error('Cannot find module');
    });

    const { awsSecretsPlugin } = await import('../../src/plugins/aws-secrets');
    const plugin = awsSecretsPlugin({ secretId: 'test' });

    await expect(plugin.load()).rejects.toThrow(/requires @aws-sdk/);
  });
});

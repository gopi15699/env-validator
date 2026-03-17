import type { EnvPlugin } from '../index';

export interface AwsSecretsPluginOptions {
  /** AWS Secrets Manager secret ID or ARN */
  secretId: string;
  /** AWS region (defaults to AWS_REGION env var) */
  region?: string;
  /**
   * Optional key mapping: maps AWS secret keys to env var names.
   * If not provided, AWS secret keys are used as env var names directly.
   * @example { 'db-password': 'DB_PASSWORD' }
   */
  keyMapping?: Record<string, string>;
}

/**
 * Plugin that loads secrets from AWS Secrets Manager and merges them
 * into the environment before validation.
 *
 * Requires: @aws-sdk/client-secrets-manager
 *
 * @example
 * const env = await createEnvAsync(schema, {
 *   plugins: [
 *     awsSecretsPlugin({ secretId: 'my-app/production', region: 'us-east-1' })
 *   ],
 * });
 */
export function awsSecretsPlugin(options: AwsSecretsPluginOptions): EnvPlugin {
  return {
    name: 'aws-secrets',

    async load(): Promise<Record<string, string>> {
      let SecretsManagerClient: typeof import('@aws-sdk/client-secrets-manager').SecretsManagerClient;
      let GetSecretValueCommand: typeof import('@aws-sdk/client-secrets-manager').GetSecretValueCommand;

      try {
        ({ SecretsManagerClient, GetSecretValueCommand } =
          await import('@aws-sdk/client-secrets-manager'));
      } catch {
        throw new Error(
          '[env-validator] awsSecretsPlugin requires @aws-sdk/client-secrets-manager.\n' +
          '  Run: npm install @aws-sdk/client-secrets-manager',
        );
      }

      const region = options.region ?? process.env['AWS_REGION'] ?? process.env['AWS_DEFAULT_REGION'];
      const client = new SecretsManagerClient({ region });

      const response = await client.send(
        new GetSecretValueCommand({ SecretId: options.secretId }),
      );

      if (!response.SecretString) {
        throw new Error(
          `[env-validator] Secret "${options.secretId}" has no SecretString value`,
        );
      }

      let raw: Record<string, unknown>;
      try {
        raw = JSON.parse(response.SecretString) as Record<string, unknown>;
      } catch {
        throw new Error(
          `[env-validator] Secret "${options.secretId}" is not valid JSON`,
        );
      }

      // Apply key mapping if provided, and stringify all values
      const result: Record<string, string> = {};
      for (const [awsKey, value] of Object.entries(raw)) {
        const envKey = options.keyMapping?.[awsKey] ?? awsKey;
        result[envKey] = String(value);
      }

      return result;
    },
  };
}

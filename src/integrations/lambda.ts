import { createEnv, createEnvAsync, type CreateEnvOptions, type CreateEnvAsyncOptions, type EnvSchema, type InferEnv } from '../index';

type AnyHandler<TEvent, TResult> = (
  event: TEvent,
  context: unknown,
) => Promise<TResult>;

type EnvHandler<TEvent, TResult, TEnv> = (
  event: TEvent,
  context: unknown,
  env: TEnv,
) => Promise<TResult>;

/**
 * Wraps a Lambda handler with environment validation.
 * Validation runs once on cold start and is cached for warm invocations.
 *
 * @example
 * import { withEnvValidation } from 'env-validator/integrations/lambda';
 *
 * export const handler = withEnvValidation(
 *   {
 *     DB_URL:     { type: 'url' },
 *     TABLE_NAME: { type: 'string' },
 *   },
 *   async (event, context, env) => {
 *     // env.DB_URL and env.TABLE_NAME are validated and typed
 *     return { statusCode: 200 };
 *   },
 *   { mode: 'strict' },
 * );
 */
export function withEnvValidation<
  const S extends EnvSchema,
  TEvent = unknown,
  TResult = unknown,
>(
  schema: S,
  handler: EnvHandler<TEvent, TResult, InferEnv<S>>,
  options?: CreateEnvOptions,
): AnyHandler<TEvent, TResult> {
  let cached: InferEnv<S> | undefined;

  return async (event: TEvent, context: unknown): Promise<TResult> => {
    // Cold start: validate and cache
    if (!cached) {
      cached = createEnv(schema, options);
    }
    return handler(event, context, cached);
  };
}

/**
 * Async version of withEnvValidation — supports plugins (e.g., AWS Secrets Manager).
 * The first invocation (cold start) will await plugin loading.
 *
 * @example
 * import { withEnvValidationAsync } from 'env-validator/integrations/lambda';
 * import { awsSecretsPlugin } from 'env-validator/plugins/aws-secrets';
 *
 * export const handler = withEnvValidationAsync(schema, myHandler, {
 *   plugins: [awsSecretsPlugin({ secretId: 'my-app/prod' })],
 * });
 */
export function withEnvValidationAsync<
  const S extends EnvSchema,
  TEvent = unknown,
  TResult = unknown,
>(
  schema: S,
  handler: EnvHandler<TEvent, TResult, InferEnv<S>>,
  options?: CreateEnvAsyncOptions,
): AnyHandler<TEvent, TResult> {
  let cached: InferEnv<S> | undefined;
  let initPromise: Promise<InferEnv<S>> | undefined;

  return async (event: TEvent, context: unknown): Promise<TResult> => {
    if (!cached) {
      // Prevent parallel cold-start initializations
      if (!initPromise) {
        initPromise = createEnvAsync(schema, options);
      }
      cached = await initPromise;
    }
    return handler(event, context, cached);
  };
}

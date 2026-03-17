import { validate, type ValidateOptions, type ValidationResult } from './validator';
import { loadDotenv, type LoaderOptions } from './loader';
import { formatErrors, formatSuccess, type ValidationError, type RuntimeMode } from './reporter';
import { type EnvSchema, type InferEnv, type FieldSchema } from './types';

export type { EnvSchema, FieldSchema, InferEnv, ValidationError, ValidationResult, RuntimeMode };
export type { EnvTypeName, TypeMap, ParseResult } from './types';
export { VALID_TYPES } from './types';

// ── Plugin interface ─────────────────────────────────────────────────────────
export interface EnvPlugin {
  name:   string;
  /** Loads additional key/value pairs to merge into the env before validation */
  load(): Promise<Record<string, string>>;
}

// ── Options ──────────────────────────────────────────────────────────────────
export interface CreateEnvOptions extends LoaderOptions, ValidateOptions {
  /**
   * Runtime mode controls what happens on validation failure.
   * - 'strict'  (default): throw an Error
   * - 'warn':   print warnings but continue (returns partial values)
   * - 'silent': no output, continue (returns partial values)
   */
  mode?:    RuntimeMode;
  /** @deprecated Use mode instead. Kept for backward compatibility. */
  onError?: 'throw' | 'exit' | 'return';
  /** @deprecated Use mode:'silent' instead. */
  quiet?:   boolean;
}

// ── Internal helpers ─────────────────────────────────────────────────────────
function resolveMode(options: CreateEnvOptions): { onError: string; quiet: boolean } {
  if (options.mode === 'warn')   return { onError: 'return', quiet: false };
  if (options.mode === 'silent') return { onError: 'return', quiet: true };
  // Legacy onError
  if (options.onError === 'exit')   return { onError: 'exit',   quiet: options.quiet ?? false };
  if (options.onError === 'return') return { onError: 'return', quiet: options.quiet ?? false };
  // Default: strict mode (throw)
  return { onError: 'throw', quiet: options.quiet ?? false };
}

function handleResult<S extends EnvSchema>(
  schema: S,
  result: ValidationResult<InferEnv<S>>,
  options: CreateEnvOptions,
): InferEnv<S> {
  const { onError, quiet } = resolveMode(options);

  if (!quiet) {
    if (result.errors.length > 0) {
      process.stderr.write(formatErrors(result.errors));
    } else {
      process.stdout.write(formatSuccess(Object.keys(schema).length));
    }
  }

  if (!result.valid) {
    if (onError === 'exit')   { process.exit(1); }
    if (onError === 'return') { return result.parsed as InferEnv<S>; }
    const hardCount = result.errors.filter(e => e.severity === 'error').length;
    const err = Object.assign(
      new Error(`Environment validation failed with ${hardCount} error(s). See err.errors for details.`),
      { code: 'ENV_VALIDATION_FAILED', errors: result.errors, parsed: result.parsed },
    );
    throw err;
  }

  return result.parsed as InferEnv<S>;
}

// ── createEnv (synchronous) ──────────────────────────────────────────────────
/**
 * Validate environment variables against a schema and return coerced values.
 * Throws (or exits) on failure by default.
 *
 * @example
 * const env = createEnv({
 *   PORT:     { type: 'port',   default: 3000 },
 *   DB_URL:   { type: 'url' },
 *   NODE_ENV: { type: 'string', enum: ['development', 'production'] as const },
 * }, { dotenv: true, mode: 'strict' });
 *
 * // env.PORT    → number
 * // env.DB_URL  → string
 * // env.NODE_ENV → 'development' | 'production'
 */
export function createEnv<const S extends EnvSchema>(
  schema: S,
  options: CreateEnvOptions = {},
): InferEnv<S> {
  loadDotenv(options);
  const result = validate(schema, options);
  return handleResult(schema, result, options);
}

// ── createEnvAsync (async — for plugins) ─────────────────────────────────────
export interface CreateEnvAsyncOptions extends CreateEnvOptions {
  /** Plugins that load additional env vars before validation (e.g., AWS Secrets Manager) */
  plugins?: EnvPlugin[];
}

/**
 * Async version of createEnv — supports plugins that fetch secrets asynchronously.
 *
 * @example
 * import { awsSecretsPlugin } from 'env-validator/plugins/aws-secrets';
 * const env = await createEnvAsync(schema, {
 *   plugins: [awsSecretsPlugin({ secretId: 'my-app/prod' })],
 * });
 */
export async function createEnvAsync<const S extends EnvSchema>(
  schema: S,
  options: CreateEnvAsyncOptions = {},
): Promise<InferEnv<S>> {
  loadDotenv(options);

  // Build a mutable env copy to merge plugin results into
  const envSource: Record<string, string | undefined> = { ...(options.env ?? process.env) };

  // Run plugins sequentially — later plugins can override earlier ones
  for (const plugin of (options.plugins ?? [])) {
    try {
      const secrets = await plugin.load();
      Object.assign(envSource, secrets);
    } catch (err) {
      throw new Error(
        `[env-validator] Plugin "${plugin.name}" failed: ${(err as Error).message}`,
      );
    }
  }

  const result = validate(schema, { ...options, env: envSource });
  return handleResult(schema, result, options);
}

// ── checkEnv (low-level, no side effects) ────────────────────────────────────
/**
 * Run validation without output or exit/throw side effects.
 * Returns the raw result for custom handling.
 */
export function checkEnv<const S extends EnvSchema>(
  schema: S,
  options: CreateEnvOptions = {},
): ValidationResult<InferEnv<S>> {
  loadDotenv(options);
  return validate(schema, options);
}

/** @deprecated Use createEnv instead */
export const validateEnv = createEnv;

import { PARSERS, type EnvSchema, type InferEnv } from './types';
import { checkConstraints, validateSchema } from './rules';
import { type ValidationError } from './reporter';

export interface ValidateOptions {
  strict?:     boolean;
  abortEarly?: boolean;
  env?:        Record<string, string | undefined>;
}

export interface ValidationResult<T> {
  valid:  boolean;
  errors: ValidationError[];
  parsed: Partial<T>;
}

export function validate<const S extends EnvSchema>(
  schema: S,
  options: ValidateOptions = {},
): ValidationResult<InferEnv<S>> {
  const { strict = false, abortEarly = false, env = process.env } = options;

  const schemaIssues = validateSchema(schema);
  if (schemaIssues.length > 0) {
    throw new Error(`[env-validator] Invalid schema:\n  ${schemaIssues.join('\n  ')}`);
  }

  const errors: ValidationError[] = [];
  const parsed: Record<string, unknown> = {};

  for (const [key, def] of Object.entries(schema)) {
    const type     = def.type ?? 'string';
    const required = def.required !== false;
    const raw      = env[key];

    // ── 1. Missing / default ────────────────────────────────────────────
    if (raw === undefined || raw === '') {
      if (def.default !== undefined) {
        parsed[key] = def.default;
        continue;
      }
      if (required) {
        errors.push({
          severity: 'error',
          variable: key,
          message:  'is required but was not set',
          hint: def.description
            ? `Expected: ${def.description}`
            : `Add ${key}=<value> to your environment`,
        });
        if (abortEarly) break;
        continue;
      }
      continue; // optional, no default, not set
    }

    // ── 2. Type parsing ──────────────────────────────────────────────────
    const parser = PARSERS[type];
    const result = parser(raw);

    if (!result.ok) {
      errors.push({
        severity: 'error',
        variable: key,
        message:  `invalid ${type}: ${result.message}`,
        hint:     def.description,
      });
      if (abortEarly) break;
      continue;
    }

    // ── 3. Constraint checks ─────────────────────────────────────────────
    const constraintError = checkConstraints(result.value, type, def);
    if (constraintError) {
      errors.push({
        severity: 'error',
        variable: key,
        message:  constraintError,
        hint:     def.description,
      });
      if (abortEarly) break;
      continue;
    }

    parsed[key] = result.value;
  }

  // ── 4. Strict mode ───────────────────────────────────────────────────────
  if (strict) {
    const schemaKeys = new Set(Object.keys(schema));
    for (const key of Object.keys(env)) {
      if (!schemaKeys.has(key)) {
        errors.push({
          severity: 'warning',
          variable: key,
          message:  'is set in the environment but not declared in the schema (strict mode)',
        });
      }
    }
  }

  const hardErrors = errors.filter(e => e.severity === 'error');
  return { valid: hardErrors.length === 0, errors, parsed: parsed as Partial<InferEnv<S>> };
}

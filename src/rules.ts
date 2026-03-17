import { type EnvTypeName, type FieldSchema, VALID_TYPES } from './types';

/**
 * Check all constraints for a field after type parsing succeeds.
 * Returns an error message string, or null if all pass.
 */
export function checkConstraints(
  value: unknown,
  type: EnvTypeName,
  field: FieldSchema,
): string | null {
  const { enum: enumValues, min, max, minLength, maxLength, pattern, validate } = field;

  if (enumValues !== undefined) {
    if (!enumValues.includes(value)) {
      const allowed = enumValues.map(v => JSON.stringify(v)).join(', ');
      return `must be one of [${allowed}], got ${JSON.stringify(value)}`;
    }
  }

  if (type === 'number' || type === 'port') {
    const n = value as number;
    if (min !== undefined && n < min) return `must be >= ${min}, got ${n}`;
    if (max !== undefined && n > max) return `must be <= ${max}, got ${n}`;
  }

  if (type === 'string' || type === 'email' || type === 'url') {
    const s = value as string;
    if (minLength !== undefined && s.length < minLength) {
      return `must be at least ${minLength} characters long, got ${s.length}`;
    }
    if (maxLength !== undefined && s.length > maxLength) {
      return `must be at most ${maxLength} characters long, got ${s.length}`;
    }
    if (pattern !== undefined) {
      const re = pattern instanceof RegExp ? pattern : new RegExp(pattern);
      if (!re.test(s)) return `must match pattern ${re.toString()}`;
    }
  }

  if (typeof validate === 'function') {
    try {
      const result = validate(value);
      if (result === false) return 'failed custom validation';
      if (typeof result === 'string') return result;
    } catch (err) {
      return `custom validator threw: ${(err as Error).message}`;
    }
  }

  return null;
}

/** Validate schema shape at load time. Returns issue strings (empty = valid). */
export function validateSchema(schema: Record<string, unknown>): string[] {
  const issues: string[] = [];

  for (const [key, def] of Object.entries(schema)) {
    if (typeof def !== 'object' || def === null || Array.isArray(def)) {
      issues.push(`[${key}] schema entry must be a plain object`);
      continue;
    }
    const d = def as Record<string, unknown>;
    if (d['type'] !== undefined && !VALID_TYPES.includes(d['type'] as EnvTypeName)) {
      issues.push(`[${key}] unknown type "${d['type']}". Valid types: ${VALID_TYPES.join(', ')}`);
    }
    if (d['enum'] !== undefined && !Array.isArray(d['enum'])) {
      issues.push(`[${key}] "enum" must be an array`);
    }
    if (d['validate'] !== undefined && typeof d['validate'] !== 'function') {
      issues.push(`[${key}] "validate" must be a function`);
    }
    if (d['required'] !== undefined && typeof d['required'] !== 'boolean') {
      issues.push(`[${key}] "required" must be a boolean`);
    }
  }

  return issues;
}

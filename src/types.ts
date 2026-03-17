// ─────────────────────────────────────────────────────────────────────────────
// Type System: Schema definitions + TypeScript inference utilities
// ─────────────────────────────────────────────────────────────────────────────

/** All supported env variable types */
export type EnvTypeName = 'string' | 'number' | 'boolean' | 'url' | 'email' | 'json' | 'port';

/** Maps type name strings to their runtime TypeScript types */
export type TypeMap = {
  string:  string;
  number:  number;
  boolean: boolean;
  url:     string;
  email:   string;
  json:    unknown;
  port:    number;
};

/** Schema definition for a single environment variable */
export interface FieldSchema {
  /** Type to parse/coerce the raw string into. Default: 'string' */
  type?:        EnvTypeName;
  /** Whether the variable is required. Default: true */
  required?:    boolean;
  /** Default value applied when the variable is absent */
  default?:     unknown;
  /** Human-readable description shown in error hints */
  description?: string;
  /** Allowed values (compared after type coercion) */
  enum?:        readonly unknown[];
  /** Minimum numeric value — applies to number and port */
  min?:         number;
  /** Maximum numeric value — applies to number and port */
  max?:         number;
  /** Minimum string length — applies to string, email, url */
  minLength?:   number;
  /** Maximum string length — applies to string, email, url */
  maxLength?:   number;
  /** Regex pattern — applies to string, email, url */
  pattern?:     RegExp | string;
  /** Custom validator. Return true/void=pass, false/string=fail */
  validate?:    (value: unknown) => boolean | string | void;
  /** Example value shown in generated .env.example */
  example?:     string;
}

export type EnvSchema = Record<string, FieldSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Type Inference Utilities
// These transform a schema object type into the output object type at compile time.
// ─────────────────────────────────────────────────────────────────────────────

/** Infer native type from the 'type' field literal */
type InferBaseType<F> = F extends { type: infer T extends EnvTypeName }
  ? TypeMap[T]
  : string; // default when type is not specified

/** If enum is provided (as const → ReadonlyArray), narrow to the union of its values */
type InferEnumType<F> = F extends { enum: ReadonlyArray<infer E> }
  ? E
  : InferBaseType<F>;

/**
 * A field is optional (can be undefined) ONLY when:
 * - required is explicitly false AND
 * - no default value is provided
 */
type IsOptional<F> = F extends { default: unknown }
  ? false   // has a default → always present
  : F extends { required: false }
    ? true  // explicitly optional with no default
    : false; // default: required=true → always present

/** Full inferred TypeScript type for a single field */
type InferField<F> = IsOptional<F> extends true
  ? InferEnumType<F> | undefined
  : InferEnumType<F>;

/**
 * Infer the full output type from a schema object.
 * Used as the return type of createEnv/createEnvAsync.
 *
 * @example
 * type MySchema = typeof schema;
 * type MyEnv = InferEnv<MySchema>;
 * // { PORT: number; DB_URL: string; DEBUG?: boolean; NODE_ENV: 'dev' | 'prod' }
 */
export type InferEnv<S extends EnvSchema> = {
  [K in keyof S]: InferField<S[K]>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Type Parsers
// Each returns { ok: true, value } or { ok: false, message }
// ─────────────────────────────────────────────────────────────────────────────

export type ParseResult<T> =
  | { ok: true;  value: T }
  | { ok: false; message: string };

function parseString(raw: string): ParseResult<string> {
  return { ok: true, value: String(raw) };
}

function parseNumber(raw: string): ParseResult<number> {
  const n = Number(raw);
  if (raw === '' || Number.isNaN(n)) {
    return { ok: false, message: `"${raw}" is not a valid number` };
  }
  return { ok: true, value: n };
}

function parseBoolean(raw: string): ParseResult<boolean> {
  const lower = raw.toLowerCase().trim();
  if (['true',  '1', 'yes', 'on' ].includes(lower)) return { ok: true, value: true  };
  if (['false', '0', 'no',  'off'].includes(lower)) return { ok: true, value: false };
  return {
    ok: false,
    message: `"${raw}" is not a valid boolean (accepted: true/false, 1/0, yes/no, on/off)`,
  };
}

function parseUrl(raw: string): ParseResult<string> {
  try {
    const u = new URL(raw);
    if (!['http:', 'https:'].includes(u.protocol)) {
      return { ok: false, message: `URL must use http or https, got "${u.protocol}"` };
    }
    return { ok: true, value: raw };
  } catch {
    return { ok: false, message: `"${raw}" is not a valid URL` };
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function parseEmail(raw: string): ParseResult<string> {
  if (!EMAIL_RE.test(raw)) {
    return { ok: false, message: `"${raw}" is not a valid email address` };
  }
  return { ok: true, value: raw };
}

function parseJson(raw: string): ParseResult<unknown> {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (err) {
    return { ok: false, message: `"${raw}" is not valid JSON: ${(err as Error).message}` };
  }
}

function parsePort(raw: string): ParseResult<number> {
  const result = parseNumber(raw);
  if (!result.ok) return { ok: false, message: `Port ${result.message}` };
  const port = result.value;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { ok: false, message: `Port must be an integer between 1 and 65535, got ${port}` };
  }
  return { ok: true, value: port };
}

export const PARSERS: { [K in EnvTypeName]: (raw: string) => ParseResult<TypeMap[K]> } = {
  string:  parseString,
  number:  parseNumber,
  boolean: parseBoolean,
  url:     parseUrl,
  email:   parseEmail,
  json:    parseJson  as (raw: string) => ParseResult<unknown>,
  port:    parsePort,
};

export const VALID_TYPES = Object.keys(PARSERS) as EnvTypeName[];

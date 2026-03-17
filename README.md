# env-validator

Schema-based environment variable validator for Node.js with **full TypeScript type inference**.

Validates that all required env vars are present, correctly typed, and within constraints **before your app starts** — with zero runtime dependencies.

```
✖  Environment Validation Failed
────────────────────────────────────────────────────────────────
  Errors (3):
  › DATABASE_URL  —  is required but was not set
      hint: PostgreSQL connection string
  › JWT_SECRET  —  must be at least 32 characters long, got 8
  › PORT  —  Port must be an integer between 1 and 65535, got 99999
────────────────────────────────────────────────────────────────
```

## Why

- Eliminate runtime crashes from missing or misconfigured env vars
- **Full TypeScript inference** — `env.PORT` is `number`, not `string | undefined`
- Works as a **CLI pre-deployment check** in CI/CD pipelines
- First-class **AWS Lambda** and **Express** integrations
- **Plugin system** for loading secrets (AWS Secrets Manager, etc.)
- The schema is your single source of truth for what your app needs

## Install

```sh
npm install @gopinath_natarajan/env-validator
# Optional: for .env file loading
npm install dotenv
```

## Quick Start

### Programmatic — add at the very top of your server entry point

```ts
import { createEnv } from 'env-validator';

const env = createEnv({
  NODE_ENV:     { type: 'string',  enum: ['development', 'staging', 'production'] as const },
  PORT:         { type: 'port',    default: 3000 },
  DATABASE_URL: { type: 'url',     description: 'PostgreSQL connection string' },
  JWT_SECRET:   { type: 'string',  minLength: 32 },
  DEBUG:        { type: 'boolean', required: false },
}, {
  dotenv:  true,     // load .env file (requires dotenv package)
  mode:    'strict', // throw if validation fails
});

// All values are correctly typed — no casting needed
app.listen(env.PORT);            // number
console.log(env.NODE_ENV);       // 'development' | 'staging' | 'production'
console.log(env.DEBUG);          // boolean | undefined
```

### CLI — pre-deployment check

```sh
# Validate against a schema file
npx env-validator validate --schema=env.schema.js

# Generate .env.example from schema
npx env-validator generate --schema=env.schema.js --output=.env.example

# CI/CD (vars already set in environment)
npx env-validator validate --schema=env.schema.js --no-dotenv
```

Add to `package.json`:
```json
{
  "scripts": {
    "prestart": "env-validator validate --schema=env.schema.js --no-dotenv"
  }
}
```

---

## TypeScript Inference

`createEnv` uses TypeScript 5 `const` type parameters — no `as const` needed on the schema.
The return type is **fully inferred** from your schema:

```ts
const env = createEnv({
  PORT:         { type: 'port',    default: 3000              },  // → number
  DB_URL:       { type: 'url'                                 },  // → string
  DEBUG:        { type: 'boolean', required: false            },  // → boolean | undefined
  NODE_ENV:     { type: 'string',  enum: ['dev', 'prod'] as const }, // → 'dev' | 'prod'
  FLAGS:        { type: 'json',    required: false            },  // → unknown | undefined
}, { env: process.env });
```

| Schema field | Output type |
|---|---|
| `required: true` (default) | `T` |
| `required: false` (no default) | `T \| undefined` |
| `default: value` | `T` (always present) |
| `enum: [...] as const` | Literal union of enum values |
| `type: 'port'` | `number` |
| `type: 'boolean'` | `boolean` |
| `type: 'json'` | `unknown` |

---

## Schema Reference

```ts
{
  VAR_NAME: {
    type?:        'string' | 'number' | 'boolean' | 'url' | 'email' | 'json' | 'port',
    required?:    boolean,              // default: true
    default?:     unknown,              // makes field always-present
    description?: string,              // shown in error hints
    enum?:        readonly unknown[],  // restrict to specific values (use as const)
    min?:         number,              // number/port: minimum value
    max?:         number,              // number/port: maximum value
    minLength?:   number,              // string/url/email: min char count
    maxLength?:   number,              // string/url/email: max char count
    pattern?:     RegExp | string,     // string/url/email: regex pattern
    validate?:    (v) => boolean | string | void, // custom: return string = error message
    example?:     string,              // shown in generated .env.example
  }
}
```

## Type Coercion

| Type | Raw string input | Output |
|---|---|---|
| `string` | `"hello"` | `"hello"` |
| `number` | `"3.14"` | `3.14` (number) |
| `boolean` | `"true"` / `"1"` / `"yes"` / `"on"` | `true` |
| `boolean` | `"false"` / `"0"` / `"no"` / `"off"` | `false` |
| `port` | `"8080"` | `8080` (integer, 1–65535) |
| `url` | `"https://..."` | validated string |
| `email` | `"user@example.com"` | validated string |
| `json` | `'{"a":1}'` | `{ a: 1 }` (parsed object) |

---

## API

### `createEnv(schema, options)` → `InferEnv<S>`

Validates and returns coerced env values. Throws on failure by default.

```ts
import { createEnv } from 'env-validator';
const env = createEnv(schema, options);
```

### `createEnvAsync(schema, options)` → `Promise<InferEnv<S>>`

Async version — supports plugins that load secrets asynchronously.

```ts
import { createEnvAsync } from 'env-validator';
import { awsSecretsPlugin } from 'env-validator/plugins/aws-secrets';

const env = await createEnvAsync(schema, {
  plugins: [awsSecretsPlugin({ secretId: 'my-app/production' })],
});
```

### `checkEnv(schema, options)` → `ValidationResult<InferEnv<S>>`

Low-level, no side effects. Returns raw result for custom handling.

```ts
const { valid, errors, parsed } = checkEnv(schema, { env: process.env });
if (!valid) {
  errors.forEach(e => console.error(`${e.variable}: ${e.message}`));
}
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `dotenv` | `boolean \| string \| string[]` | `false` | Load `.env` file(s). `true` = `.env`, string = path, array = multiple files (later overrides earlier) |
| `override` | `boolean` | `false` | Let dotenv override already-set vars |
| `mode` | `'strict' \| 'warn' \| 'silent'` | `'strict'` | Failure behavior |
| `abortEarly` | `boolean` | `false` | Stop after first error |
| `strict` | `boolean` | `false` | Warn on undeclared env vars |
| `quiet` | `boolean` | `false` | Suppress all output |
| `env` | `object` | `process.env` | Override env source (tests) |

**`mode` values:**
- `'strict'` — throw an `Error` (with `.errors` + `.parsed` attached)
- `'warn'` — print warnings, return partial values, don't throw
- `'silent'` — no output, return partial values, don't throw

---

## Multi-env Support

Load multiple `.env` files — later files override earlier ones:

```ts
const env = createEnv(schema, {
  dotenv: ['.env', '.env.local', `.env.${process.env.NODE_ENV}`],
});
// .env.local overrides .env; .env.production overrides both
```

---

## Express Integration

```ts
import express from 'express';
import { attachEnv, envMiddleware } from 'env-validator/integrations/express';

const app = express();

// Validate at startup, attach to app.locals.env
const env = attachEnv(app, {
  PORT:     { type: 'port', default: 3000 },
  DB_URL:   { type: 'url' },
  NODE_ENV: { type: 'string', enum: ['development', 'production'] as const },
}, { dotenv: true, mode: 'strict' });

// Optional: make env available on req.env in routes
app.use(envMiddleware());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: env.NODE_ENV });
});

app.listen(env.PORT);
```

---

## AWS Lambda Integration

Validates env vars **once on cold start**, then reuses the cached result on warm invocations:

```ts
import { withEnvValidation } from 'env-validator/integrations/lambda';

export const handler = withEnvValidation(
  {
    TABLE_NAME:     { type: 'string' },
    AWS_REGION:     { type: 'string', default: 'us-east-1' },
    ENABLE_TRACING: { type: 'boolean', default: false },
  },
  async (event, context, env) => {
    // env.TABLE_NAME → string (validated + typed)
    // env.ENABLE_TRACING → boolean
    return { statusCode: 200, body: JSON.stringify({ table: env.TABLE_NAME }) };
  },
  { mode: 'strict' },
);
```

### Lambda + AWS Secrets Manager (async)

```ts
import { withEnvValidationAsync } from 'env-validator/integrations/lambda';
import { awsSecretsPlugin } from 'env-validator/plugins/aws-secrets';

export const handler = withEnvValidationAsync(
  schema,
  async (event, context, env) => { /* handler */ },
  {
    plugins: [awsSecretsPlugin({ secretId: 'my-app/prod', region: 'us-east-1' })],
  },
);
```

---

## Plugin System

Plugins load additional key/value pairs into the environment **before validation**.

```ts
import { createEnvAsync, type EnvPlugin } from 'env-validator';

// Custom plugin example
const vaultPlugin = (): EnvPlugin => ({
  name: 'vault',
  async load() {
    const secrets = await fetchFromVault();
    return { DB_PASSWORD: secrets.dbPassword };
  },
});

const env = await createEnvAsync(schema, { plugins: [vaultPlugin()] });
```

### AWS Secrets Manager Plugin

```ts
import { awsSecretsPlugin } from 'env-validator/plugins/aws-secrets';

const env = await createEnvAsync(schema, {
  plugins: [
    awsSecretsPlugin({
      secretId:   'my-app/production',
      region:     'us-east-1',
      keyMapping: { 'db-password': 'DB_PASSWORD' }, // optional: rename keys
    }),
  ],
});
```

Requires: `npm install @aws-sdk/client-secrets-manager`

---

## CLI Reference

```
Usage: env-validator <command> [options]

Commands:
  validate   Validate environment variables against a schema  [default]
  generate   Generate a .env.example file from a schema

Validate options:
  --schema=<path>     Path to schema file (.js)   [required]
  --env=<path>        .env file(s) to load         [default: .env]
  --strict            Warn on undeclared env vars
  --no-dotenv         Skip .env loading (use in CI where vars are already set)
  --abort-early       Stop after first error
  --quiet             No output — use exit code only
  --mode=<mode>       strict | warn | silent

Generate options:
  --schema=<path>     Path to schema file (.js)   [required]
  --output=<path>     Output file path             [default: .env.example]

Exit codes:
  0   Valid / generated successfully
  1   Validation errors found
  2   Bad arguments or schema load failure
```

---

## CI/CD Integration

**GitHub Actions:**
```yaml
- name: Validate environment
  run: npx env-validator validate --schema=env.schema.js --no-dotenv
  env:
    NODE_ENV:     production
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    JWT_SECRET:   ${{ secrets.JWT_SECRET }}
    PORT:         "3000"
```

**Docker / entrypoint:**
```sh
# entrypoint.sh
node_modules/.bin/env-validator validate --schema=env.schema.js --no-dotenv || exit 1
node dist/server.js
```

---

## Real-World Schema Example

```js
// env.schema.js
module.exports = {
  NODE_ENV:     { type: 'string', enum: ['development', 'staging', 'production'] },
  PORT:         { type: 'port',   default: 3000 },
  DATABASE_URL: { type: 'url',    description: 'PostgreSQL connection string' },
  DB_POOL_SIZE: { type: 'number', required: false, default: 10, min: 1, max: 100 },
  JWT_SECRET:   { type: 'string', minLength: 32, description: 'Min 32 chars' },
  JWT_EXPIRES_IN: { type: 'string', required: false, default: '7d', pattern: /^\d+[smhd]$/ },
  REDIS_URL:    { type: 'url',    required: false },
  ADMIN_EMAIL:  { type: 'email',  required: false },
  FEATURE_FLAGS:{ type: 'json',   required: false, default: {} },
  ENABLE_METRICS: { type: 'boolean', default: false },
};
```

---

## Tips

**Use `env` option in tests to avoid touching `process.env`:**
```ts
const { valid } = checkEnv(schema, { env: { PORT: '3000', DB_URL: 'https://...' } });
```

**Disable colors:** Set `NO_COLOR=1` (follows [no-color.org](https://no-color.org)).

**JSON type returns parsed object** — use the returned `env` object, not `process.env`:
```ts
const env = createEnv({ FLAGS: { type: 'json', default: {} } });
env.FLAGS  // object — already parsed
```

## License

MIT

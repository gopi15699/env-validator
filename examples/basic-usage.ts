/**
 * basic-usage.ts — Demonstrates programmatic usage of env-validator.
 * Run after building: npx ts-node examples/basic-usage.ts
 */

import { createEnv } from '../src/index';

const env = createEnv(
  {
    NODE_ENV: {
      type:    'string' as const,
      enum:    ['development', 'staging', 'production'] as const,
    },
    PORT: {
      type:    'port' as const,
      default: 3000,
    },
    DATABASE_URL: {
      type:        'url' as const,
      description: 'PostgreSQL connection string',
    },
    JWT_SECRET: {
      type:      'string' as const,
      minLength: 32,
    },
    REDIS_URL: {
      type:     'url' as const,
      required: false as const,
    },
    ENABLE_METRICS: {
      type:    'boolean' as const,
      default: false,
    },
  },
  {
    env: {
      NODE_ENV:     'production',
      DATABASE_URL: 'https://db.example.com',
      JWT_SECRET:   'a-very-secret-key-that-is-long-enough!!',
    },
    quiet: false,
  },
);

// All values are correctly typed — no casting needed
console.log('PORT          :', env.PORT,           `(${typeof env.PORT})`);           // number
console.log('NODE_ENV      :', env.NODE_ENV,        `(${typeof env.NODE_ENV})`);       // 'production'
console.log('ENABLE_METRICS:', env.ENABLE_METRICS, `(${typeof env.ENABLE_METRICS})`); // boolean
console.log('REDIS_URL     :', env.REDIS_URL,       `(${typeof env.REDIS_URL})`);      // undefined

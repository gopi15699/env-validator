import type { EnvSchema } from '../../src/index';

export const schema = {
  NODE_ENV: {
    type:    'string' as const,
    enum:    ['development', 'staging', 'production'] as const,
    description: 'Application runtime environment',
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
} satisfies EnvSchema;

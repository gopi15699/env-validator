import type { EnvSchema } from '../../src/index';

export const schema = {
  TABLE_NAME: {
    type:        'string' as const,
    description: 'DynamoDB table name',
  },
  AWS_REGION: {
    type:    'string' as const,
    default: 'us-east-1',
  },
  LOG_LEVEL: {
    type:     'string' as const,
    required: false as const,
    enum:     ['debug', 'info', 'warn', 'error'] as const,
    default:  'info',
  },
  ENABLE_TRACING: {
    type:    'boolean' as const,
    default: false,
  },
} satisfies EnvSchema;

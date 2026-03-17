import { expectTypeOf } from 'vitest';
import { createEnv } from '../src/index';

// Test that createEnv infers types correctly from schema
const env = createEnv(
  {
    PORT:     { type: 'port'    as const, default: 3000         },
    DB_URL:   { type: 'url'     as const                        },
    DEBUG:    { type: 'boolean' as const, required: false as const },
    NODE_ENV: { type: 'string'  as const, enum: ['dev', 'prod'] as const },
    COUNT:    { type: 'number'  as const                        },
    SMTP:     { type: 'email'   as const, required: false as const },
    FLAGS:    { type: 'json'    as const, required: false as const },
  },
  { env: { DB_URL: 'https://db.local', NODE_ENV: 'dev', COUNT: '1' } },
);

// PORT has a default → always number
expectTypeOf(env.PORT).toEqualTypeOf<number>();

// DB_URL required (no default) → string
expectTypeOf(env.DB_URL).toEqualTypeOf<string>();

// DEBUG required:false, no default → boolean | undefined
expectTypeOf(env.DEBUG).toEqualTypeOf<boolean | undefined>();

// NODE_ENV enum as const → literal union
expectTypeOf(env.NODE_ENV).toEqualTypeOf<'dev' | 'prod'>();

// COUNT required number
expectTypeOf(env.COUNT).toEqualTypeOf<number>();

// SMTP optional email → string | undefined
expectTypeOf(env.SMTP).toEqualTypeOf<string | undefined>();

// FLAGS optional json → unknown | undefined
expectTypeOf(env.FLAGS).toEqualTypeOf<unknown>();

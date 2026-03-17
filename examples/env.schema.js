/**
 * env.schema.js — Example schema for a typical Node.js web application.
 * Run: npx env-validator validate --schema=examples/env.schema.js --no-dotenv
 * Gen: npx env-validator generate --schema=examples/env.schema.js --output=.env.example
 */
module.exports = {
  // Server
  NODE_ENV: {
    type:        'string',
    enum:        ['development', 'staging', 'production'],
    description: 'Application runtime environment',
  },
  PORT: {
    type:        'port',
    default:     3000,
    description: 'HTTP server port',
  },

  // Database
  DATABASE_URL: {
    type:        'url',
    description: 'Database connection string',
  },
  DB_POOL_SIZE: {
    type:     'number',
    required: false,
    default:  10,
    min:      1,
    max:      100,
  },

  // Auth
  JWT_SECRET: {
    type:        'string',
    minLength:   32,
    description: 'Secret key for signing JWTs — must be at least 32 characters',
  },

  // Feature flags
  ENABLE_METRICS: {
    type:    'boolean',
    default: false,
  },
};

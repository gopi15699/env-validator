/**
 * Express demo — shows env-validator integration.
 * The server refuses to start if any required env var is missing or invalid.
 */

import express from 'express';
import { attachEnv, envMiddleware } from '../../src/integrations/express';
import { schema } from './env.schema';

const app = express();

// Validate at startup — exits with code 1 if any var is invalid
const env = attachEnv(app, schema, {
  dotenv:  true,         // load .env file
  mode:    'strict',     // throw on failure
});

// Mount the middleware so routes can access req.env
app.use(envMiddleware());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    env:    env.NODE_ENV,
    port:   env.PORT,
  });
});

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

export default app;

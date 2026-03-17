import type { Application, RequestHandler, Request, Response, NextFunction } from 'express';
import { createEnv, type CreateEnvOptions, type EnvSchema, type InferEnv } from '../index';

/**
 * Validates the environment and attaches the parsed result to `app.locals.env`.
 * Call this at app startup before defining routes.
 *
 * @example
 * import express from 'express';
 * import { attachEnv } from 'env-validator/integrations/express';
 *
 * const app = express();
 * const env = attachEnv(app, {
 *   PORT:     { type: 'port',   default: 3000 },
 *   DB_URL:   { type: 'url' },
 * }, { dotenv: true, mode: 'strict' });
 *
 * // env.PORT is a number; app.locals.env.PORT is also a number
 * app.listen(env.PORT);
 */
export function attachEnv<const S extends EnvSchema>(
  app: Application,
  schema: S,
  options?: CreateEnvOptions,
): InferEnv<S> {
  const env = createEnv(schema, options);
  app.locals['env'] = env;
  return env;
}

/**
 * Express middleware that makes the validated env available on `req.env`.
 * Must be used after `attachEnv` has been called on the app.
 *
 * @example
 * app.use(envMiddleware());
 * app.get('/health', (req, res) => {
 *   res.json({ env: req.env.NODE_ENV });
 * });
 */
export function envMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any)['env'] = req.app.locals['env'];
    next();
  };
}

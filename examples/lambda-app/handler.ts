/**
 * AWS Lambda demo — shows env-validator cold-start validation.
 * Env vars are validated ONCE on cold start, then reused on warm invocations.
 */

import { withEnvValidation } from '../../src/integrations/lambda';
import { schema } from './env.schema';

interface ApiGatewayEvent {
  httpMethod: string;
  path:       string;
}

interface ApiGatewayResult {
  statusCode: number;
  body:       string;
}

export const handler = withEnvValidation(
  schema,
  async (event: ApiGatewayEvent, _context, env) => {
    // env.TABLE_NAME → string (validated on cold start)
    // env.LOG_LEVEL  → 'debug' | 'info' | 'warn' | 'error'
    console.log(`[${env.LOG_LEVEL}] Processing ${event.httpMethod} ${event.path}`);
    console.log(`Table: ${env.TABLE_NAME}`);

    const result: ApiGatewayResult = {
      statusCode: 200,
      body: JSON.stringify({
        message: 'OK',
        table:   env.TABLE_NAME,
        region:  env.AWS_REGION,
        tracing: env.ENABLE_TRACING,
      }),
    };
    return result;
  },
  {
    // No dotenv in Lambda — vars come from Lambda configuration
    mode: 'strict',
  },
);

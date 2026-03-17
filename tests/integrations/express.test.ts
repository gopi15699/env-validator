import { describe, it, expect, vi } from 'vitest';

// Mock express
vi.mock('express', () => ({
  default: () => ({
    locals: {} as Record<string, unknown>,
  }),
}));

describe('Express integration', () => {
  it('attaches validated env to app.locals', async () => {
    const { attachEnv } = await import('../../src/integrations/express');
    const app = { locals: {} as Record<string, unknown> };

    const env = attachEnv(
      app as never,
      { PORT: { type: 'port' as const, default: 3000 } },
      { env: {}, quiet: true },
    );

    expect(env.PORT).toBe(3000);
    expect(app.locals['env']).toBe(env);
  });

  it('envMiddleware copies app.locals.env to req.env', async () => {
    const { envMiddleware } = await import('../../src/integrations/express');
    const middleware = envMiddleware();
    const mockEnv = { PORT: 3000 };
    const req = { app: { locals: { env: mockEnv } } };
    const res = {};
    const next = vi.fn();

    middleware(req as never, res as never, next);

    expect((req as Record<string, unknown>)['env']).toBe(mockEnv);
    expect(next).toHaveBeenCalled();
  });
});

import { describe, it, expect, vi } from 'vitest';

describe('Lambda integration', () => {
  it('withEnvValidation caches env after cold start', async () => {
    const { withEnvValidation } = await import('../../src/integrations/lambda');

    const validateSpy = vi.fn().mockReturnValue({ PORT: 3000 });
    vi.doMock('../../src/index', () => ({ createEnv: validateSpy }));

    const schema = { PORT: { type: 'port' as const, default: 3000 } };
    const innerHandler = vi.fn().mockResolvedValue({ statusCode: 200 });

    const handler = withEnvValidation(schema, innerHandler, { env: {}, quiet: true });

    await handler({}, {});
    await handler({}, {}); // second call — should use cache

    expect(innerHandler).toHaveBeenCalledTimes(2);
    expect(innerHandler.mock.calls[0]![2]).toEqual({ PORT: 3000 });
  });

  it('withEnvValidation passes env as third argument', async () => {
    const { withEnvValidation } = await import('../../src/integrations/lambda');

    const receivedEnv: unknown[] = [];
    const handler = withEnvValidation(
      { PORT: { type: 'port' as const, default: 9000 } },
      async (event, ctx, env) => { receivedEnv.push(env); return null; },
      { env: {}, quiet: true },
    );

    await handler({ body: 'test' }, {});
    expect((receivedEnv[0] as Record<string, unknown>)['PORT']).toBe(9000);
  });
});

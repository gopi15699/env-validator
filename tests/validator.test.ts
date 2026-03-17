import { describe, it, expect } from 'vitest';
import { checkEnv, createEnv } from '../src/index';

describe('required fields', () => {
  it('passes when required var is set', () => {
    const { valid, parsed } = checkEnv({ API_KEY: { type: 'string' } }, { env: { API_KEY: 'abc' } });
    expect(valid).toBe(true);
    expect(parsed.API_KEY).toBe('abc');
  });
  it('errors on missing required var', () => {
    const { valid, errors } = checkEnv({ DB_URL: { type: 'url' } }, { env: {} });
    expect(valid).toBe(false);
    expect(errors[0]!.variable).toBe('DB_URL');
    expect(errors[0]!.severity).toBe('error');
  });
  it('collects all errors (not abortEarly)', () => {
    const { errors } = checkEnv({ A: {}, B: {}, C: {} }, { env: {} });
    expect(errors.length).toBe(3);
  });
  it('stops at first error with abortEarly', () => {
    const { errors } = checkEnv({ A: {}, B: {} }, { env: {}, abortEarly: true });
    expect(errors.length).toBe(1);
  });
});

describe('optional fields and defaults', () => {
  it('applies default when var is absent', () => {
    const { valid, parsed } = checkEnv({ PORT: { type: 'port', default: 3000 } }, { env: {} });
    expect(valid).toBe(true);
    expect(parsed.PORT).toBe(3000);
  });
  it('skips optional var with no default', () => {
    const { valid, parsed } = checkEnv({ REDIS: { type: 'url', required: false } }, { env: {} });
    expect(valid).toBe(true);
    expect(parsed.REDIS).toBeUndefined();
  });
  it('treats empty string as missing', () => {
    const { valid } = checkEnv({ KEY: { type: 'string' } }, { env: { KEY: '' } });
    expect(valid).toBe(false);
  });
});

describe('strict mode', () => {
  it('adds warnings for undeclared vars', () => {
    const { valid, errors } = checkEnv(
      { PORT: { type: 'port', default: 3000 } },
      { env: { PORT: '3000', UNKNOWN: 'x' }, strict: true },
    );
    expect(valid).toBe(true); // warnings don't cause failure
    const warn = errors.find(e => e.variable === 'UNKNOWN');
    expect(warn?.severity).toBe('warning');
  });
});

describe('schema integrity', () => {
  it('throws on invalid type', () => {
    expect(() => checkEnv({ X: { type: 'badtype' as never } }, { env: {} }))
      .toThrow(/Invalid schema/);
  });
  it('throws when schema entry is not an object', () => {
    expect(() => checkEnv({ X: 'string' as never }, { env: {} }))
      .toThrow(/Invalid schema/);
  });
});

describe('multi-env (dotenv array)', () => {
  it('checkEnv respects custom env object', () => {
    const { valid, parsed } = checkEnv(
      { PORT: { type: 'port' }, HOST: { type: 'string', default: 'localhost' } },
      { env: { PORT: '9000' } },
    );
    expect(valid).toBe(true);
    expect(parsed.PORT).toBe(9000);
    expect(parsed.HOST).toBe('localhost');
  });
});

describe('mode option', () => {
  it('mode:warn returns partial values on failure', () => {
    const result = createEnv(
      { PORT: { type: 'port' }, DB: { type: 'url' } },
      { env: { PORT: '3000' }, mode: 'warn', quiet: true },
    ) as Record<string, unknown>;
    expect(result['PORT']).toBe(3000);
  });
});

import { describe, it, expect } from 'vitest';
import { checkEnv } from '../src/index';

const check = (schema: Parameters<typeof checkEnv>[0], env: Record<string, string>) =>
  checkEnv(schema, { env });

describe('type: string', () => {
  it('passes any non-empty string', () => {
    const { valid, parsed } = check({ S: { type: 'string' } }, { S: 'hello world' });
    expect(valid).toBe(true);
    expect(parsed.S).toBe('hello world');
  });
});

describe('type: number', () => {
  it('coerces integer string to number', () => {
    const { valid, parsed } = check({ N: { type: 'number' } }, { N: '42' });
    expect(valid).toBe(true);
    expect(parsed.N).toBe(42);
    expect(typeof parsed.N).toBe('number');
  });
  it('coerces float string', () => {
    const { parsed } = check({ N: { type: 'number' } }, { N: '3.14' });
    expect(parsed.N).toBe(3.14);
  });
  it('rejects non-numeric string', () => {
    expect(check({ N: { type: 'number' } }, { N: 'abc' }).valid).toBe(false);
  });
});

describe('type: boolean', () => {
  const trueValues  = ['true', '1', 'yes', 'on', 'TRUE', 'YES'];
  const falseValues = ['false', '0', 'no', 'off', 'FALSE', 'NO'];
  for (const raw of trueValues) {
    it(`"${raw}" → true`, () => {
      const { valid, parsed } = check({ F: { type: 'boolean' } }, { F: raw });
      expect(valid).toBe(true);
      expect(parsed.F).toBe(true);
    });
  }
  for (const raw of falseValues) {
    it(`"${raw}" → false`, () => {
      const { valid, parsed } = check({ F: { type: 'boolean' } }, { F: raw });
      expect(valid).toBe(true);
      expect(parsed.F).toBe(false);
    });
  }
  it('rejects ambiguous value', () => {
    expect(check({ F: { type: 'boolean' } }, { F: 'maybe' }).valid).toBe(false);
  });
});

describe('type: url', () => {
  it('accepts https URL', () => {
    expect(check({ U: { type: 'url' } }, { U: 'https://example.com' }).valid).toBe(true);
  });
  it('rejects ftp URL', () => {
    expect(check({ U: { type: 'url' } }, { U: 'ftp://example.com' }).valid).toBe(false);
  });
  it('rejects plain hostname', () => {
    expect(check({ U: { type: 'url' } }, { U: 'example.com' }).valid).toBe(false);
  });
});

describe('type: email', () => {
  it('accepts valid email', () => {
    expect(check({ E: { type: 'email' } }, { E: 'user@example.com' }).valid).toBe(true);
  });
  it('rejects missing @', () => {
    expect(check({ E: { type: 'email' } }, { E: 'notanemail' }).valid).toBe(false);
  });
});

describe('type: json', () => {
  it('parses valid JSON object', () => {
    const { valid, parsed } = check({ J: { type: 'json' } }, { J: '{"a":1}' });
    expect(valid).toBe(true);
    expect(parsed.J).toEqual({ a: 1 });
  });
  it('rejects malformed JSON', () => {
    expect(check({ J: { type: 'json' } }, { J: '{bad}' }).valid).toBe(false);
  });
});

describe('type: port', () => {
  it('coerces valid port', () => {
    const { valid, parsed } = check({ P: { type: 'port' } }, { P: '8080' });
    expect(valid).toBe(true);
    expect(parsed.P).toBe(8080);
    expect(typeof parsed.P).toBe('number');
  });
  it('rejects port 0',     () => expect(check({ P: { type: 'port' } }, { P: '0'     }).valid).toBe(false));
  it('rejects port 65536', () => expect(check({ P: { type: 'port' } }, { P: '65536' }).valid).toBe(false));
  it('rejects float port', () => expect(check({ P: { type: 'port' } }, { P: '80.5'  }).valid).toBe(false));
});

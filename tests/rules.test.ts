import { describe, it, expect } from 'vitest';
import { checkEnv } from '../src/index';

const check = (schema: Parameters<typeof checkEnv>[0], env: Record<string, string>) =>
  checkEnv(schema, { env });

describe('constraint: enum', () => {
  it('passes in-enum value', () => {
    expect(check({ ENV: { type: 'string', enum: ['dev', 'prod'] as const } }, { ENV: 'prod' }).valid).toBe(true);
  });
  it('fails out-of-enum value', () => {
    const { valid, errors } = check({ ENV: { type: 'string', enum: ['dev', 'prod'] as const } }, { ENV: 'test' });
    expect(valid).toBe(false);
    expect(errors[0]!.message).toMatch(/one of/);
  });
  it('works with coerced number enum', () => {
    expect(check({ L: { type: 'number', enum: [1, 2, 3] as const } }, { L: '2' }).valid).toBe(true);
  });
});

describe('constraint: min/max (number)', () => {
  it('fails below min', () => {
    const { errors } = check({ N: { type: 'number', min: 10 } }, { N: '5' });
    expect(errors[0]!.message).toMatch(/>= 10/);
  });
  it('fails above max', () => {
    const { errors } = check({ N: { type: 'number', max: 100 } }, { N: '200' });
    expect(errors[0]!.message).toMatch(/<= 100/);
  });
  it('passes on boundary', () => {
    expect(check({ N: { type: 'number', min: 5, max: 5 } }, { N: '5' }).valid).toBe(true);
  });
});

describe('constraint: minLength/maxLength (string)', () => {
  it('fails short string', () => {
    expect(check({ S: { type: 'string', minLength: 10 } }, { S: 'short' }).valid).toBe(false);
  });
  it('fails long string', () => {
    expect(check({ S: { type: 'string', maxLength: 3 } }, { S: 'toolong' }).valid).toBe(false);
  });
  it('passes exact length', () => {
    expect(check({ S: { type: 'string', minLength: 5, maxLength: 5 } }, { S: 'hello' }).valid).toBe(true);
  });
});

describe('constraint: pattern', () => {
  it('passes matching pattern', () => {
    expect(check({ V: { type: 'string', pattern: /^\d+\.\d+$/ } }, { V: '1.0' }).valid).toBe(true);
  });
  it('fails non-matching pattern', () => {
    expect(check({ V: { type: 'string', pattern: /^\d+\.\d+$/ } }, { V: 'v1' }).valid).toBe(false);
  });
  it('accepts string pattern', () => {
    expect(check({ K: { type: 'string', pattern: '^sk-' } }, { K: 'sk-abc' }).valid).toBe(true);
  });
});

describe('constraint: validate (custom)', () => {
  it('passes when returns true', () => {
    expect(check({ X: { type: 'string', validate: v => (v as string).startsWith('sk-') } }, { X: 'sk-abc' }).valid).toBe(true);
  });
  it('fails when returns false', () => {
    expect(check({ X: { type: 'string', validate: () => false } }, { X: 'any' }).valid).toBe(false);
  });
  it('uses returned string as error message', () => {
    const { errors } = check({ X: { type: 'string', validate: () => 'must start with sk-' } }, { X: 'any' });
    expect(errors[0]!.message).toMatch(/must start with sk-/);
  });
  it('handles validator that throws', () => {
    const { valid, errors } = check(
      { X: { type: 'string', validate: () => { throw new Error('boom'); } } },
      { X: 'val' },
    );
    expect(valid).toBe(false);
    expect(errors[0]!.message).toMatch(/boom/);
  });
});

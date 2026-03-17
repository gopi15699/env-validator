import { describe, it, expect } from 'vitest';
import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI    = path.resolve(__dirname, '../dist/cli.js');
const SCHEMA = path.resolve(__dirname, '../examples/env.schema.js');
const NODE   = process.execPath;

function runCli(
  args: string[],
  envOverrides: Record<string, string> = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise(resolve => {
    execFile(NODE, [CLI, ...args], {
      env: { NO_COLOR: '1', ...envOverrides },
    }, (err, stdout, stderr) => {
      resolve({ code: err ? (err as NodeJS.ErrnoException).code as unknown as number ?? 1 : 0, stdout, stderr });
    });
  });
}

const VALID_ENV = {
  NODE_ENV:       'production',
  DATABASE_URL:   'https://db.example.com',
  JWT_SECRET:     'a'.repeat(32),
  ENABLE_METRICS: 'false',
};

describe('CLI argument handling', () => {
  it('exits 2 when --schema is missing', async () => {
    const { code, stderr } = await runCli(['--no-dotenv']);
    expect(code).toBe(2);
    expect(stderr).toMatch(/--schema/);
  });

  it('exits 2 for nonexistent schema', async () => {
    const { code } = await runCli(['--schema=nonexistent.js', '--no-dotenv']);
    expect(code).toBe(2);
  });

  it('exits 0 with --help', async () => {
    const { code, stdout } = await runCli(['--help']);
    expect(code).toBe(0);
    expect(stdout).toMatch(/Usage:/);
  });

  it('exits 0 with --version', async () => {
    const { code, stdout } = await runCli(['--version']);
    expect(code).toBe(0);
    expect(stdout).toMatch(/env-validator v/);
  });
});

describe('CLI validate command', () => {
  it('exits 1 when required vars are missing', async () => {
    const { code, stderr } = await runCli(
      ['--schema=' + SCHEMA, '--no-dotenv'],
      { NODE_ENV: 'production' },
    );
    expect(code).toBe(1);
    expect(stderr).toMatch(/Errors/);
  });

  it('exits 0 when all required vars are set', async () => {
    const { code, stdout } = await runCli(
      ['--schema=' + SCHEMA, '--no-dotenv'],
      VALID_ENV,
    );
    expect(code).toBe(0);
    expect(stdout).toMatch(/validated successfully/);
  });

  it('no output with --quiet', async () => {
    const { code, stdout, stderr } = await runCli(
      ['--schema=' + SCHEMA, '--no-dotenv', '--quiet'],
      VALID_ENV,
    );
    expect(code).toBe(0);
    expect(stdout.trim()).toBe('');
    expect(stderr.trim()).toBe('');
  });
});

describe('CLI generate command', () => {
  it('generates .env.example to stdout path', async () => {
    const tmpOut = path.join(__dirname, '.tmp-env-example');
    const { code } = await runCli(
      ['generate', '--schema=' + SCHEMA, `--output=${tmpOut}`],
      VALID_ENV,
    );
    expect(code).toBe(0);
    // cleanup
    try { require('fs').unlinkSync(tmpOut); } catch {}
  });
});

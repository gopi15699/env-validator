/** Options controlling .env file loading */
export interface LoaderOptions {
  /** Load .env file(s). true = '.env', string = path, string[] = multiple files (later overrides earlier) */
  dotenv?:   boolean | string | string[];
  /** Let dotenv override already-set env vars */
  override?: boolean;
}

/** Load .env file(s) using the optional dotenv peer dependency. */
export function loadDotenv(options: LoaderOptions): void {
  if (!options.dotenv) return;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  let dotenv: typeof import('dotenv');
  try {
    dotenv = require('dotenv') as typeof import('dotenv');
  } catch {
    throw new Error(
      '[env-validator] The "dotenv" option requires the dotenv package.\n  Run: npm install dotenv',
    );
  }

  const paths = normalizeDotenvPaths(options.dotenv);

  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    // First file: respect the override option; subsequent files always override
    const shouldOverride = i > 0 ? true : (options.override ?? false);
    const result = dotenv.config({ path, override: shouldOverride });

    // Only surface errors for explicitly-specified paths (not true/'default .env')
    if (result.error && typeof path === 'string' && options.dotenv !== true) {
      throw new Error(
        `[env-validator] Failed to load .env file at "${path}": ${result.error.message}`,
      );
    }
  }
}

function normalizeDotenvPaths(dotenv: boolean | string | string[]): string[] {
  if (dotenv === true) return ['.env'];
  if (typeof dotenv === 'string') return [dotenv];
  if (Array.isArray(dotenv)) return dotenv;
  return ['.env'];
}

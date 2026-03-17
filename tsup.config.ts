import { defineConfig } from 'tsup';

export default defineConfig([
  // Main library — dual ESM + CJS
  {
    entry: {
      index:                  'src/index.ts',
      'integrations/express': 'src/integrations/express.ts',
      'integrations/lambda':  'src/integrations/lambda.ts',
      'plugins/aws-secrets':  'src/plugins/aws-secrets.ts',
    },
    format:   ['cjs', 'esm'],
    dts:      true,
    clean:    true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    external: ['express', '@aws-sdk/client-secrets-manager', 'dotenv'],
    outDir: 'dist',
  },
  // CLI — CJS with shebang
  {
    entry:  { cli: 'src/cli.ts' },
    format: ['cjs'],
    dts:    false,
    banner: { js: '#!/usr/bin/env node' },
    external: ['dotenv'],
    outDir: 'dist',
  },
]);

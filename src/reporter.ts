export type RuntimeMode = 'strict' | 'warn' | 'silent';

/** ANSI color codes — respects NO_COLOR env var */
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  gray:   '\x1b[90m',
} as const;

const useColor = (): boolean =>
  !process.env['NO_COLOR'] && process.stdout.isTTY !== false;

export const colorize = (code: string, text: string): string =>
  useColor() ? `${code}${text}${C.reset}` : text;

export { C };

export interface ValidationError {
  severity: 'error' | 'warning';
  variable: string;
  message:  string;
  hint?:    string;
}

const SYMBOLS = { error: '✖', warning: '⚠', success: '✔', bullet: '›' } as const;

export function formatErrors(
  errors: ValidationError[],
  title = 'Environment Validation Failed',
): string {
  const lines: string[] = [];
  const divider = colorize(C.gray, '─'.repeat(52));

  lines.push('');
  lines.push(colorize(C.bold + C.red, `${SYMBOLS.error}  ${title}`));
  lines.push(divider);

  const hard = errors.filter(e => e.severity === 'error');
  const soft = errors.filter(e => e.severity === 'warning');

  if (hard.length) {
    lines.push(colorize(C.red + C.bold, `  Errors (${hard.length}):`));
    for (const e of hard) {
      lines.push(
        colorize(C.red,  `  ${SYMBOLS.bullet} `) +
        colorize(C.bold, e.variable) +
        colorize(C.gray, '  —  ') +
        e.message,
      );
      if (e.hint) lines.push(colorize(C.dim, `      hint: ${e.hint}`));
    }
  }

  if (soft.length) {
    if (hard.length) lines.push('');
    lines.push(colorize(C.yellow + C.bold, `  Warnings (${soft.length}):`));
    for (const e of soft) {
      lines.push(
        colorize(C.yellow, `  ${SYMBOLS.bullet} `) +
        colorize(C.bold,   e.variable) +
        colorize(C.gray,   '  —  ') +
        e.message,
      );
      if (e.hint) lines.push(colorize(C.dim, `      hint: ${e.hint}`));
    }
  }

  lines.push(divider);
  lines.push('');
  return lines.join('\n');
}

export function formatSuccess(count: number): string {
  return colorize(C.green, `${SYMBOLS.success}  All ${count} environment variable(s) validated successfully.\n`);
}

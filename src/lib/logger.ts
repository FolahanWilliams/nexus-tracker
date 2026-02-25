/**
 * Structured logger that respects the runtime environment.
 *
 * - In production: errors only (warnings and info are silenced).
 * - In development: all levels are printed.
 *
 * Every log entry is prefixed with an ISO timestamp and an optional tag,
 * making it easy to filter in browser DevTools or server logs.
 */

type LogLevel = 'info' | 'warn' | 'error';

const IS_PROD =
    typeof process !== 'undefined'
        ? process.env.NODE_ENV === 'production'
        : false;

function formatMessage(level: LogLevel, tag: string | undefined, message: string): string {
    const ts = new Date().toISOString();
    const prefix = tag ? `[${tag}]` : '';
    return `${ts} ${level.toUpperCase()} ${prefix} ${message}`.trim();
}

/** Log informational messages (silenced in production). */
function info(message: string, tag?: string, ...extra: unknown[]): void {
    if (IS_PROD) return;
    console.log(formatMessage('info', tag, message), ...extra);
}

/** Log warnings (silenced in production). */
function warn(message: string, tag?: string, ...extra: unknown[]): void {
    if (IS_PROD) return;
    console.warn(formatMessage('warn', tag, message), ...extra);
}

/** Log errors (always printed, even in production). */
function error(message: string, tag?: string, ...extra: unknown[]): void {
    console.error(formatMessage('error', tag, message), ...extra);
}

export const logger = { info, warn, error } as const;

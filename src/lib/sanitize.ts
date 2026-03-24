/**
 * Input sanitization helpers for AI prompt injection prevention.
 *
 * These functions limit length and strip control sequences from user-supplied
 * text before it gets interpolated into AI prompts.
 */

/**
 * Sanitize a string for safe inclusion in an AI prompt.
 * - Trims whitespace
 * - Enforces a max character length (default 2000)
 * - Strips characters commonly used in prompt injection (backticks for
 *   markdown fences, excessive newlines that mimic prompt boundaries)
 */
export function sanitizePromptInput(
    input: unknown,
    maxLength = 2000,
): string {
    if (typeof input !== 'string') return '';
    return input
        .trim()
        .slice(0, maxLength)
        // Collapse triple+ backticks (used to fake fenced code blocks / prompt boundaries)
        .replace(/`{3,}/g, '`')
        // Collapse 3+ consecutive newlines into 2 (prevents fake section breaks)
        .replace(/\n{3,}/g, '\n\n');
}

/**
 * Sanitize an array of strings (e.g. vocab words, labels).
 * Each element is trimmed and length-capped, and the array itself is capped.
 */
export function sanitizeStringArray(
    input: unknown,
    maxItems = 50,
    maxItemLength = 200,
): string[] {
    if (!Array.isArray(input)) return [];
    return input
        .filter((item): item is string => typeof item === 'string')
        .slice(0, maxItems)
        .map((s) => s.trim().slice(0, maxItemLength));
}

/**
 * Clamp a numeric value returned by AI to a safe range.
 * Returns the default if the value is not a finite number.
 */
export function clampNumber(
    value: unknown,
    min: number,
    max: number,
    defaultValue: number,
): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) return defaultValue;
    return Math.max(min, Math.min(max, Math.round(value)));
}

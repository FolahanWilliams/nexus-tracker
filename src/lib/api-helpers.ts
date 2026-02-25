/**
 * Shared helpers for API routes that call Google Gemini.
 *
 * Centralises the repeated patterns:
 *   1.  API-key check → mock response when the key is absent.
 *   2.  Try / catch wrapper with structured logging and fallback response.
 */

import { NextResponse } from 'next/server';
import { logger } from './logger';

/**
 * Return `true` when the Gemini API key is configured.
 * If absent, responds with the supplied mock payload and returns `false`.
 */
export function hasApiKeyOrMock<T extends Record<string, unknown>>(
    mockPayload: T,
): NextResponse | null {
    if (process.env.GOOGLE_API_KEY) return null;
    logger.warn('No GOOGLE_API_KEY found, returning mock response', 'api');
    return NextResponse.json({ ...mockPayload, isMock: true });
}

/**
 * Wraps an async API-route handler with:
 *   • Structured error logging
 *   • A JSON fallback response on failure
 *
 * Usage:
 * ```ts
 * export const POST = withErrorHandler('generate-quest', fallbackPayload, async (req) => {
 *     // ...route logic...
 *     return NextResponse.json(data);
 * });
 * ```
 */
export function withErrorHandler(
    tag: string,
    fallback: Record<string, unknown>,
    handler: (request: Request) => Promise<NextResponse>,
): (request: Request) => Promise<NextResponse> {
    return async (request: Request) => {
        try {
            return await handler(request);
        } catch (error) {
            logger.error('Request failed', tag, error);
            return NextResponse.json(
                { ...fallback, isMock: true, error: 'AI unavailable' },
                { status: 500 },
            );
        }
    };
}

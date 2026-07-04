/**
 * Shared helpers for API routes that call the AI layer (Vercel AI Gateway).
 *
 * Centralises the repeated patterns:
 *   1.  Gateway-auth check → mock response when no auth is available.
 *   2.  Try / catch wrapper with structured logging and fallback response.
 */

import { NextResponse } from 'next/server';
import { logger } from './logger';
import { hasAIGateway } from './env';

/**
 * Return `null` when AI Gateway auth is configured (key or OIDC token).
 * If absent, responds with the supplied mock payload instead.
 */
export function hasApiKeyOrMock<T extends Record<string, unknown>>(
    mockPayload: T,
): NextResponse | null {
    if (hasAIGateway()) return null;
    logger.warn('No AI Gateway auth found, returning mock response', 'api');
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

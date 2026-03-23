/**
 * API route wrapper that enforces Supabase authentication and optional
 * rate limiting.
 *
 * Usage:
 * ```ts
 * import { withAuth } from '@/lib/with-auth';
 *
 * export const POST = withAuth(async (request, user) => {
 *     // `user` is the authenticated Supabase user
 *     return NextResponse.json({ ok: true });
 * });
 * ```
 *
 * With rate limiting:
 * ```ts
 * export const POST = withAuth(handler, { rateLimitMax: 20, rateLimitWindowMs: 60_000 });
 * ```
 */

import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createSupabaseServer } from './supabase-server';
import { createRateLimiter } from './rate-limit';
import { logger } from './logger';

interface WithAuthOptions {
    /** Max requests per user in the rate-limit window. Default: no limit. */
    rateLimitMax?: number;
    /** Rate-limit window in ms. Default: 60 000 (1 minute). */
    rateLimitWindowMs?: number;
}

type AuthenticatedHandler = (
    request: Request,
    user: User,
) => Promise<NextResponse>;

// Cache rate limiters per options signature so they persist across requests.
const limiterCache = new Map<string, ReturnType<typeof createRateLimiter>>();

function getLimiter(max: number, windowMs: number) {
    const key = `${max}:${windowMs}`;
    let limiter = limiterCache.get(key);
    if (!limiter) {
        limiter = createRateLimiter({ windowMs, max });
        limiterCache.set(key, limiter);
    }
    return limiter;
}

export function withAuth(
    handler: AuthenticatedHandler,
    options: WithAuthOptions = {},
): (request: Request) => Promise<NextResponse> {
    return async (request: Request) => {
        try {
            // 1. Authenticate via Supabase session cookie
            const supabase = await createSupabaseServer();
            const {
                data: { user },
                error,
            } = await supabase.auth.getUser();

            if (error || !user) {
                return NextResponse.json(
                    { error: 'Unauthorized' },
                    { status: 401 },
                );
            }

            // 2. Rate limit (if configured)
            if (options.rateLimitMax) {
                const limiter = getLimiter(
                    options.rateLimitMax,
                    options.rateLimitWindowMs ?? 60_000,
                );
                const { success, remaining } = limiter.check(user.id);
                if (!success) {
                    return NextResponse.json(
                        { error: 'Too many requests. Please slow down.' },
                        {
                            status: 429,
                            headers: {
                                'Retry-After': String(
                                    Math.ceil(
                                        (options.rateLimitWindowMs ?? 60_000) /
                                            1000,
                                    ),
                                ),
                            },
                        },
                    );
                }
                // Attach remaining count for observability
                void remaining;
            }

            // 3. Delegate to the actual handler
            return await handler(request, user);
        } catch (err) {
            logger.error('withAuth unexpected error', 'auth', err);
            return NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 },
            );
        }
    };
}

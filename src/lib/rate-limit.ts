/**
 * Simple in-memory sliding-window rate limiter for API routes.
 *
 * Each limiter instance keeps a Map of `key → timestamp[]`.
 * Old entries are pruned on every call so memory stays bounded.
 *
 * Usage:
 * ```ts
 * const limiter = createRateLimiter({ windowMs: 60_000, max: 20 });
 *
 * // In your route handler:
 * const { success, remaining } = limiter.check(userId);
 * if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 * ```
 *
 * NOTE: This is per-process. In a multi-instance deployment (e.g. Vercel
 * serverless) each cold-start gets a fresh map.  For stricter enforcement
 * use an external store (Redis / Upstash).  This is still a significant
 * improvement over zero rate limiting.
 */

interface RateLimiterOptions {
    /** Time window in milliseconds. */
    windowMs: number;
    /** Max requests allowed per key in the window. */
    max: number;
}

interface RateLimitResult {
    success: boolean;
    remaining: number;
}

export function createRateLimiter({ windowMs, max }: RateLimiterOptions) {
    const hits = new Map<string, number[]>();

    /** Remove entries older than the current window. */
    function prune(key: string, now: number) {
        const timestamps = hits.get(key);
        if (!timestamps) return;
        const cutoff = now - windowMs;
        // Find the first index within the window
        let i = 0;
        while (i < timestamps.length && timestamps[i] <= cutoff) i++;
        if (i > 0) timestamps.splice(0, i);
        if (timestamps.length === 0) hits.delete(key);
    }

    /** Periodically purge stale keys to prevent unbounded growth. */
    let lastPurge = Date.now();
    const PURGE_INTERVAL = 60_000; // every 60 s

    function maybePurge(now: number) {
        if (now - lastPurge < PURGE_INTERVAL) return;
        lastPurge = now;
        for (const key of hits.keys()) {
            prune(key, now);
        }
    }

    return {
        check(key: string): RateLimitResult {
            const now = Date.now();
            maybePurge(now);
            prune(key, now);

            const timestamps = hits.get(key) ?? [];
            if (timestamps.length >= max) {
                return { success: false, remaining: 0 };
            }

            timestamps.push(now);
            hits.set(key, timestamps);
            return { success: true, remaining: max - timestamps.length };
        },
    };
}

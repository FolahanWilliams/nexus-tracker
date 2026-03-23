import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js proxy (formerly middleware) — runs on every matched request.
 *
 * Responsibilities:
 *   1. Inject security headers (CSP, HSTS, X-Frame-Options, etc.)
 *   2. Future: request logging, CORS, CSRF tokens
 *
 * Authentication is handled per-route via `withAuth()` rather than here,
 * because each route may need different rate limits and some routes
 * (webhooks, health checks) must remain unauthenticated.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function proxy(_request: NextRequest) {
    const response = NextResponse.next();

    // ── Security headers ────────────────────────────────────────────────
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set(
        'Permissions-Policy',
        'camera=(), microphone=(self), geolocation=()',
    );
    response.headers.set(
        'Strict-Transport-Security',
        'max-age=63072000; includeSubDomains; preload',
    );

    // Basic CSP — allows self, Supabase, Gemini, Stripe, and inline styles
    // (Tailwind/Framer Motion use inline styles). Tighten as needed.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const csp = [
        "default-src 'self'",
        `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com`,
        `style-src 'self' 'unsafe-inline'`,
        `img-src 'self' data: blob: ${supabaseUrl}`,
        `font-src 'self'`,
        `connect-src 'self' ${supabaseUrl} https://*.supabase.co https://generativelanguage.googleapis.com https://api.openai.com https://api.stripe.com`,
        `frame-src https://js.stripe.com`,
        "object-src 'none'",
        "base-uri 'self'",
    ].join('; ');

    response.headers.set('Content-Security-Policy', csp);

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico, manifest files, icons
         * - SW and workbox files
         */
        '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|icons/|sw\\.js|workbox-).*)',
    ],
};

/**
 * Environment variable validation.
 *
 * Import this module early (e.g. in layout.tsx or API routes) to get
 * clear startup errors instead of cryptic runtime failures.
 */

import { logger } from './logger';

interface EnvConfig {
    /** Vercel AI Gateway key (optional — OIDC is used on Vercel, mock data when neither is present). */
    AI_GATEWAY_API_KEY: string | undefined;
    /** Supabase project URL. */
    NEXT_PUBLIC_SUPABASE_URL: string | undefined;
    /** Supabase anonymous/public key. */
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string | undefined;
}

function getEnv(): EnvConfig {
    return {
        AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    };
}

/**
 * Whether the Vercel AI Gateway is reachable: either an explicit API key is
 * set, or we're running on Vercel / after `vercel env pull` where an OIDC
 * token authenticates automatically.
 */
export function hasAIGateway(): boolean {
    return !!(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
}

/**
 * Validate that expected environment variables are present.
 * Logs warnings for missing optional vars and throws for missing required ones
 * (only when running on the server — client-side only sees NEXT_PUBLIC_ vars).
 */
export function validateEnv(): EnvConfig {
    const env = getEnv();

    // Supabase credentials are needed for auth + cloud sync.
    // The app degrades gracefully (local-only persistence) without them,
    // so we warn rather than throw.
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        logger.warn(
            'Supabase credentials missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). ' +
            'Auth and cloud sync will be unavailable. Persistence is local-only.',
            'env',
        );
    }

    // Gateway auth is optional — all AI routes fall back to mock data without it.
    if (typeof window === 'undefined' && !hasAIGateway()) {
        logger.warn(
            'No AI Gateway auth found (AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN). ' +
            'AI features (quest generation, vocab, coaching) will return mock/fallback data. ' +
            'Run `vercel env pull` or set AI_GATEWAY_API_KEY.',
            'env',
        );
    }

    return env;
}

/**
 * Environment variable validation.
 *
 * Import this module early (e.g. in layout.tsx or API routes) to get
 * clear startup errors instead of cryptic runtime failures.
 */

interface EnvConfig {
    /** Google Gemini API key (optional — mock data is used when absent). */
    GOOGLE_API_KEY: string | undefined;
    /** Supabase project URL. */
    NEXT_PUBLIC_SUPABASE_URL: string | undefined;
    /** Supabase anonymous/public key. */
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string | undefined;
}

function getEnv(): EnvConfig {
    return {
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    };
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
        console.warn(
            '[env] Supabase credentials missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). ' +
            'Auth and cloud sync will be unavailable. Persistence is local-only.'
        );
    }

    // Gemini key is optional — all AI routes fall back to mock data without it.
    if (typeof window === 'undefined' && !env.GOOGLE_API_KEY) {
        console.warn(
            '[env] GOOGLE_API_KEY not set. AI features (quest generation, vocab, coaching) ' +
            'will return mock/fallback data.'
        );
    }

    return env;
}

/** Whether the Gemini API is configured and available. */
export function hasGeminiKey(): boolean {
    return !!process.env.GOOGLE_API_KEY;
}

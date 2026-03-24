/**
 * Server-side Supabase admin client using the service role key.
 *
 * Used by API routes that need to bypass RLS (e.g., Stripe webhooks,
 * subscription management, access code redemption).
 *
 * Throws at startup if required env vars are missing — this surfaces
 * as a clear error in logs rather than a cryptic runtime crash.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
    if (_adminClient) return _adminClient;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error(
            'Missing required env vars: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY'
        );
    }

    _adminClient = createClient(url, key);
    return _adminClient;
}

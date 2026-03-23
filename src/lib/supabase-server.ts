/**
 * Server-side Supabase client for API routes.
 *
 * Uses `@supabase/ssr` with the cookie store to resolve the authenticated
 * user from the request.  Every API route that needs auth should call
 * `createSupabaseServer()` and then `supabase.auth.getUser()`.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServer() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch {
                        // Ignore when called from a Server Component context
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.delete({ name, ...options });
                    } catch {
                        // Ignore when called from a Server Component context
                    }
                },
            },
        },
    );
}

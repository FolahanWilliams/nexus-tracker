import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing. Persistence will be local-only.');
}

export const supabase = createBrowserClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder',
    {
        auth: {
            // Bypass the Navigator LockManager API.  Supabase v2.97+ acquires
            // an exclusive lock around every auth operation (token refresh,
            // session read, etc.).  If a previous lock isn't released quickly
            // enough (slow network, stale tab, rehydration during callback)
            // the next acquisition times out after 10 s, causing:
            //   "Acquiring an exclusive Navigator LockManager lock … timed out"
            // A no-op lock is safe here — this is a single-user game tracker,
            // not a multi-tab banking app that needs cross-tab token coordination.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => fn(),
        },
    }
);

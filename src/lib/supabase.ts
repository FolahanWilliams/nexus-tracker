import { createBrowserClient } from '@supabase/ssr';
import { logger } from './logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    logger.warn('Supabase credentials missing. Persistence will be local-only.', 'supabase');
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
            lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => fn(),
        },
    }
);

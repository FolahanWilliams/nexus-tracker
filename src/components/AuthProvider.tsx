'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { hybridStorage } from '@/lib/indexedDB';
import { useToastStore } from '@/components/ToastContainer';
import { useGameStore } from '@/store/useGameStore';
import { setCachedUid } from '@/lib/zustandStorage';
import { logger } from '@/lib/logger';

interface AuthContext {
    user: User | null;
    loading: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContext>({
    user: null,
    loading: true,
    signIn: async () => { },
    signOut: async () => { },
});

export function useAuth() {
    return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const prevUidRef = useRef<string | null | undefined>(undefined);

    // Single unified effect: handles initial hydration and auth changes.
    //
    // With skipHydration: true, getItem is NOT called during store creation
    // (which happens during SSR).  We call rehydrate() from onAuthStateChange
    // so that auth state is known before getItem runs — this allows getItem to
    // load from Supabase when the user is logged in.
    useEffect(() => {
        // IMPORTANT: This callback must be synchronous (no async/await).
        // Supabase v2.97 AWAITS onAuthStateChange callbacks while holding
        // the Navigator Lock.  If this callback returns a slow promise
        // (e.g. cloud data fetch via rehydrate), the lock is held for the
        // entire duration, and any concurrent auth operation (token refresh,
        // visibility change) times out after 10 s.
        //
        // By keeping the callback sync and deferring rehydrate via
        // setTimeout(0), the lock is released immediately.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            const currentUser = session?.user ?? null;
            const prevUid = prevUidRef.current;
            prevUidRef.current = currentUser?.id ?? null;

            // Push UID into the storage cache BEFORE rehydrate so getItem()
            // can read it without calling getSession() (which would deadlock
            // because onAuthStateChange already holds the Navigator Lock).
            setCachedUid(currentUser?.id ?? null);

            setUser(currentUser);
            setLoading(false);

            // Rehydrate on:
            // 1. First auth event (prevUid === undefined) — handles both
            //    logged-in users AND anonymous users on initial page load.
            // 2. Login transitions (new user ID that differs from previous).
            const isFirstEvent = prevUid === undefined;
            const isNewLogin = currentUser != null && currentUser.id !== prevUid;

            if (isFirstEvent || isNewLogin) {
                // Defer to next macrotask so Supabase releases the
                // Navigator Lock before rehydrate touches the network.
                setTimeout(() => {
                    useGameStore.persist.rehydrate();
                }, 0);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signIn = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/v1/callback`
                }
            });
            if (error) throw error;
        } catch (error: unknown) {
            logger.error('Sign-in error', 'auth', error);
            const message = error instanceof Error ? error.message : 'Sign-in failed';
            useToastStore.getState().addToast(message, 'error');
        }
    };

    const signOut = async () => {
        try {
            // Clear cached UID and local data to prevent leaking state
            setCachedUid(null);
            await hybridStorage.clear();
            await supabase.auth.signOut();
        } catch (error) {
            logger.error('Sign-out error', 'auth', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { subscribeToSupabase } from '@/lib/supabaseSync';
import { setRemoteUpdateFlag } from '@/lib/zustandStorage';
import { useToastStore } from '@/components/ToastContainer';
import { useGameStore } from '@/store/useGameStore';

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
    const unsubRef = useRef<(() => void) | null>(null);

    // Single unified effect: handles initial hydration, auth changes, and realtime.
    //
    // With skipHydration: true, getItem is NOT called during store creation
    // (which happens during SSR).  We call rehydrate() from onAuthStateChange
    // so that auth state is known before getItem runs — this allows getItem to
    // load from Supabase when the user is logged in.
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            const currentUser = session?.user ?? null;
            const prevUid = prevUidRef.current;
            prevUidRef.current = currentUser?.id ?? null;

            setUser(currentUser);
            setLoading(false);

            // Tear down previous realtime subscription
            if (unsubRef.current) {
                unsubRef.current();
                unsubRef.current = null;
            }

            // Rehydrate on:
            // 1. First auth event (prevUid === undefined) — handles both
            //    logged-in users AND anonymous users on initial page load.
            // 2. Login transitions (new user ID that differs from previous).
            const isFirstEvent = prevUid === undefined;
            const isNewLogin = currentUser != null && currentUser.id !== prevUid;

            if (isFirstEvent || isNewLogin) {
                await useGameStore.persist.rehydrate();

                // Set up realtime subscription for logged-in users.
                // When another device pushes changes to Supabase, the callback
                // receives the full cloud state and merges it into the store.
                if (currentUser) {
                    unsubRef.current = subscribeToSupabase(currentUser.id, (remoteState) => {
                        if (!remoteState) return;
                        setRemoteUpdateFlag(true);
                        try {
                            useGameStore.setState(remoteState.state || remoteState, false);
                        } finally {
                            setRemoteUpdateFlag(false);
                        }
                    });
                }
            }
        });

        return () => {
            subscription.unsubscribe();
            if (unsubRef.current) unsubRef.current();
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
        } catch (error: any) {
            console.error('Sign-in error:', error);
            useToastStore.getState().addToast(error.message, 'error');
        }
    };

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Sign-out error:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

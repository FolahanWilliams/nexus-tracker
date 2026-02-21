'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { getAuthInstance, googleProvider } from '@/lib/firebase';
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
    // Track whether this is the very first auth-state resolution so we can
    // distinguish "user was already logged in on page load" from a mid-session
    // sign-in — both need a rehydration, but only the first should be silent.
    const prevUidRef = useRef<string | null | undefined>(undefined); // undefined = not yet resolved

    useEffect(() => {
        const auth = getAuthInstance();
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            const prevUid = prevUidRef.current;
            prevUidRef.current = firebaseUser?.uid ?? null;

            setUser(firebaseUser);
            setLoading(false);

            // Rehydrate the Zustand store whenever a user becomes authenticated.
            //
            // Why this is necessary:
            // Zustand's persist middleware calls getItem() exactly once — at module
            // initialisation, before React has mounted.  At that point Firebase Auth
            // has not yet restored its session from IndexedDB, so currentUser is null
            // and getItem() falls back to local storage instead of Firestore.
            //
            // By calling rehydrate() here we give getItem() a second chance now that
            // currentUser is guaranteed to be set, so it will fetch the user's real
            // cloud state and push it into the store.
            //
            // We trigger this whenever the uid changes (new login or page load with an
            // existing session) but NOT on sign-out (firebaseUser === null).
            if (firebaseUser && firebaseUser.uid !== prevUid) {
                await useGameStore.persist.rehydrate();
            }
        });
        return unsubscribe;
    }, []);

    const signIn = async () => {
        try {
            const auth = getAuthInstance();
            await signInWithPopup(auth, googleProvider);
        } catch (error: any) {
            console.error('Sign-in error:', error);
            const message = error?.message || 'Failed to sign in. Please try again.';
            useToastStore.getState().addToast(
                error?.code === 'auth/unauthorized-domain'
                    ? 'Unauthorized domain! Add this URL to Firebase Auth Authorized Domains.'
                    : message,
                'error'
            );
        }
    };

    const signOut = async () => {
        try {
            const auth = getAuthInstance();
            await firebaseSignOut(auth);
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

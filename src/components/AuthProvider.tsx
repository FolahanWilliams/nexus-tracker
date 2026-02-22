'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { getAuthInstance, googleProvider } from '@/lib/firebase';
import { subscribeToFirestore } from '@/lib/firestoreSync';
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
    // Track whether this is the very first auth-state resolution so we can
    // distinguish "user was already logged in on page load" from a mid-session
    // sign-in — both need a rehydration, but only the first should be silent.
    const prevUidRef = useRef<string | null | undefined>(undefined); // undefined = not yet resolved
    const unsubFirestoreRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        const auth = getAuthInstance();
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            const prevUid = prevUidRef.current;
            prevUidRef.current = firebaseUser?.uid ?? null;

            setUser(firebaseUser);
            setLoading(false);

            // Clean up previous Firestore subscription
            if (unsubFirestoreRef.current) {
                unsubFirestoreRef.current();
                unsubFirestoreRef.current = null;
            }

            // Rehydrate the Zustand store whenever a user becomes authenticated.
            if (firebaseUser && firebaseUser.uid !== prevUid) {
                await useGameStore.persist.rehydrate();

                // Subscribe to real-time Firestore updates for multi-device sync.
                // When another device saves, this callback pushes the new state
                // into the local Zustand store without triggering a save-back loop.
                unsubFirestoreRef.current = subscribeToFirestore(
                    firebaseUser.uid,
                    (remoteState) => {
                        if (!remoteState) return;
                        try {
                            const parsed = JSON.parse(remoteState);
                            // Merge the remote state into the store without re-saving to Firestore
                            setRemoteUpdateFlag(true);
                            useGameStore.setState(parsed.state ?? parsed, false);
                            setRemoteUpdateFlag(false);
                        } catch (err) {
                            console.error('Failed to apply remote state:', err);
                            setRemoteUpdateFlag(false);
                        }
                    }
                );
            }
        });
        return () => {
            unsubscribe();
            if (unsubFirestoreRef.current) {
                unsubFirestoreRef.current();
                unsubFirestoreRef.current = null;
            }
        };
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

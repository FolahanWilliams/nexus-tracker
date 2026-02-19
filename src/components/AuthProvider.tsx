'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { getAuthInstance, googleProvider } from '@/lib/firebase';

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

    useEffect(() => {
        const auth = getAuthInstance();
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const signIn = async () => {
        try {
            const auth = getAuthInstance();
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error('Sign-in error:', error);
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

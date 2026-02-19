import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Lazy initialization — only on client
let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

function getApp(): FirebaseApp {
    if (!app) {
        app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    }
    return app;
}

export function getAuthInstance(): Auth {
    if (typeof window === 'undefined') {
        throw new Error('Firebase Auth can only be used on the client');
    }
    if (!authInstance) {
        authInstance = getAuth(getApp());
    }
    return authInstance;
}

export function getDbInstance(): Firestore {
    if (typeof window === 'undefined') {
        throw new Error('Firestore can only be used on the client');
    }
    if (!dbInstance) {
        dbInstance = getFirestore(getApp());
        // Enable offline persistence
        import('firebase/firestore').then(({ enableIndexedDbPersistence }) => {
            enableIndexedDbPersistence(dbInstance!).catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.warn('Firestore persistence failed: multiple tabs open');
                } else if (err.code === 'unimplemented') {
                    console.warn('Firestore persistence not available');
                }
            });
        });
    }
    return dbInstance;
}

export const googleProvider = new GoogleAuthProvider();

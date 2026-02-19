import { doc, setDoc, getDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { getDbInstance } from './firebase';

const COLLECTION = 'users';
const DOC_ID = 'gameState';

export async function saveToFirestore(uid: string, state: unknown): Promise<void> {
    try {
        const db = getDbInstance();
        const ref = doc(db, COLLECTION, uid, 'data', DOC_ID);
        await setDoc(ref, {
            state: JSON.stringify(state),
            updatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Firestore save error:', error);
    }
}

export async function loadFromFirestore(uid: string): Promise<string | null> {
    try {
        const db = getDbInstance();
        const ref = doc(db, COLLECTION, uid, 'data', DOC_ID);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            return snap.data().state || null;
        }
        return null;
    } catch (error) {
        console.error('Firestore load error:', error);
        return null;
    }
}

export function subscribeToFirestore(
    uid: string,
    callback: (state: string | null) => void
): Unsubscribe {
    const db = getDbInstance();
    const ref = doc(db, COLLECTION, uid, 'data', DOC_ID);
    return onSnapshot(ref, (snap) => {
        if (snap.exists()) {
            callback(snap.data().state || null);
        }
    }, (error) => {
        console.error('Firestore subscription error:', error);
    });
}

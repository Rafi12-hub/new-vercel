import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const _hasAllKeys = () => {
  const values = Object.values(firebaseConfig);
  return values.every(v => v && v !== '' && !v.startsWith('your-'));
};

export const isFirebaseConfigured = _hasAllKeys();

let app = null;
let auth = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    if (import.meta.env.DEV) {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099');
      console.log('[FIREBASE] Connected to Auth Emulator (port 9099)');
    }
  } catch (e) {
    console.error('[FIREBASE] Init failed:', e.message);
  }
}

export { app, auth };
export default auth;

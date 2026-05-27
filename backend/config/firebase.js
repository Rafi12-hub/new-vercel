const admin = require('firebase-admin');
require('dotenv').config();

if (!admin.apps.length) {
    if (process.env.FIREBASE_PROJECT_ID) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Replace escaped newlines with actual newlines
                privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
            }),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
    } else {
        // Fallback to default application credentials
        admin.initializeApp({
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
    }
}

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

module.exports = { admin, db, auth, storage };

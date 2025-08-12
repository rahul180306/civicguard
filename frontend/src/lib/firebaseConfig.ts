// firebaseConfig.ts
// Centralized Firebase initialization using Next.js env vars.
// Client-side only modules (Database/Analytics) are guarded appropriately.

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getDatabase, type Database } from 'firebase/database'
// Optional services you can enable as needed:
// import { getAuth, type Auth } from 'firebase/auth'
// import { getFirestore, type Firestore } from 'firebase/firestore'
// import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics'

// Build config from NEXT_PUBLIC_* envs (don’t hardcode secrets)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

let app: FirebaseApp
if (!getApps().length) {
  app = initializeApp(firebaseConfig)
} else {
  app = getApp()
}

// Realtime Database (client-side)
const database: Database = getDatabase(app)

export { app as firebaseApp, database }
// export const auth: Auth = getAuth(app)
// export const firestore: Firestore = getFirestore(app)
// export async function getAnalyticsSafe(): Promise<Analytics | null> {
//   if (typeof window === 'undefined') return null
//   try { return (await isSupported()) ? getAnalytics(app) : null } catch { return null }
// }

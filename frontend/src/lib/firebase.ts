// Client-side Firebase initialization for Next.js
// Uses NEXT_PUBLIC_* vars so config isn’t hardcoded.
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics'

export type { FirebaseApp, Analytics }

let app: FirebaseApp | null = null
let analytics: Analytics | null = null

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    const config = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    }
    const apps = getApps()
    app = apps.length ? apps[0] : initializeApp(config)
  }
  return app!
}

export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (analytics) return analytics
  // Analytics only works in the browser and requires window
  if (typeof window === 'undefined') return null
  const app = getFirebaseApp()
  try {
    if (await isSupported()) {
      analytics = getAnalytics(app)
      return analytics
    }
  } catch {}
  return null
}

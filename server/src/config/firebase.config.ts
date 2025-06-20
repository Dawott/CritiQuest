import admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

export const DB_PATHS = {
  USERS: 'users',
  PHILOSOPHERS: 'philosophers',
  LESSONS: 'lessons',
  QUIZZES: 'quizzes',
  ACHIEVEMENTS: 'achievements',
  LEADERBOARDS: 'leaderboards',
  USER_PROGRESS: 'userProgress',
  GACHA_SYSTEM: 'gachaSystem',
  LESSON_ANALYTICS: 'analytics',
  USER_PROFILES: 'profile'
} as const;

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};
/*
let firebaseApp;
let auth;
let database;

export const initializeFirebaseWeb = () => {
  try {
    // Check if Firebase is already initialized
    if (getApps().length === 0) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApps()[0];
    }
    
    auth = getAuth(firebaseApp);
    database = getDatabase(firebaseApp);
    
    console.log('✅ Firebase Web SDK initialized');
    return { app: firebaseApp, auth, database };
  } catch (error) {
    console.error('❌ Firebase Web initialization failed:', error);
    throw new Error('Failed to initialize Firebase Web SDK');
  }
};

export const getFirebaseAuth = () => {
  if (!auth) {
    initializeFirebaseWeb();
  }
  return auth;
};

export const getFirebaseDatabase = () => {
  if (!database) {
    initializeFirebaseWeb();
  }
  return database;
};

export const isDevelopment = process.env.NODE_ENV === 'development';
*/

export const initializeFirebase = async (): Promise<void> => {
  try {
    if (admin.apps.length === 0) {
      // Service account
      if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH) as ServiceAccount;
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: process.env.FIREBASE_DATABASE_URL,
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        });
      }
      // Env variables
      else if (process.env.FIREBASE_PROJECT_ID) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
          databaseURL: process.env.FIREBASE_DATABASE_URL,
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        });
      }
      // Default
      else {
        admin.initializeApp();
      }

      console.log('✅ Firebase Admin SDK zainicjalizowano');
      
      // Test połączenia
      await testDatabaseConnection();
    }
  } catch (error) {
    console.error('❌ Firebase inicjalizacja nieudana:', error);
    throw new Error('Błąd inicjalizacji Firebase Admin SDK');
  }
};

const testDatabaseConnection = async (): Promise<void> => {
  try {
    const db = admin.database();
    await db.ref('.info/connected').once('value');
    console.log('✅ Firebase Realtime Database zweryfikowano');
  } catch (error) {
    console.error('❌ Test połączenia nieudany:', error);
    throw error;
  }
};

export const getFirebaseAuth = () => admin.auth();
export const getFirebaseDatabase = () => admin.database();
export const getFirebaseStorage = () => admin.storage();

export const createDatabaseRef = (path: string) => admin.database().ref(path);
export const batchWrite = async (updates: Record<string, any>) => {
  return admin.database().ref().update(updates);
};

export const runTransaction = async (
  ref: admin.database.Reference,
  updateFunction: (currentData: any) => any
) => {
  return ref.transaction(updateFunction);
};
/*
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
export { firebase };
export const isDevelopment = __DEV__;*/
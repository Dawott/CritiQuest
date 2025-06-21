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

// Web Firebase config - these should be public environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Initialize Firebase for web
let firebaseApp: any;
let auth: any;
let database: any;

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
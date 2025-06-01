import firebase from '@react-native-firebase/app';

export const DB_PATHS = {
  USERS: 'users',
  PHILOSOPHERS: 'philosophers',
  LESSONS: 'lessons',
  QUIZZES: 'quizzes',
  ACHIEVEMENTS: 'achievements',
  LEADERBOARDS: 'leaderboards',
  USER_PROGRESS: 'userProgress',
  GACHA_SYSTEM: 'gachaSystem',
} as const;

export const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "your-api-key",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://your-project.firebaseio.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "your-sender-id",
  appId: process.env.FIREBASE_APP_ID || "your-app-id"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export { firebase };

export const isDevelopment = __DEV__;
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

let app;

const firebase = {
  app: () => {
    if (!app) {
      app = initializeApp(firebaseConfig);
    }
    return app;
  },
  apps: [],
  initializeApp: (config) => {
    app = initializeApp(config);
    return app;
  }
};

export default firebase;
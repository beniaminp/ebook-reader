import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore/lite';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDkhH0ks-8cpuguwvGRSVNBcjnpziRaDGA',
  authDomain: 'ebookreader-5350c.firebaseapp.com',
  projectId: 'ebookreader-5350c',
  storageBucket: 'ebookreader-5350c.firebasestorage.app',
  messagingSenderId: '646161384281',
  appId: '1:646161384281:web:50966cc4b4be11f17d8248',
  measurementId: 'G-67LW639CY1',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

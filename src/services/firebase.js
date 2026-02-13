import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
   apiKey: "AIzaSyAKR_fRlSh3dLZGYh5IzUqcjqVi4nTZWNs",
   authDomain: "mvmafia-2.firebaseapp.com",
   databaseURL: "https://mvmafia-2-default-rtdb.firebaseio.com",
   projectId: "mvmafia-2",
   storageBucket: "mvmafia-2.firebasestorage.app",
   messagingSenderId: "10354978426",
   appId: "1:10354978426:web:2e508bb2274a07c21495c3",
   measurementId: "G-GSZ8K1TXMG"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

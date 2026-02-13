import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
   apiKey: "AIzaSyC1krwZreM63Mqmjz5CBYJUzjc-fleBzqs",
   authDomain: "mafia-d2c5d.firebaseapp.com",
   databaseURL: "https://mafia-d2c5d-default-rtdb.firebaseio.com",
   projectId: "mafia-d2c5d",
   storageBucket: "mafia-d2c5d.firebasestorage.app",
   messagingSenderId: "205580538027",
   appId: "1:205580538027:web:9d1b842b79cfca5272a7ee",
   measurementId: "G-NHG3PWE426"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

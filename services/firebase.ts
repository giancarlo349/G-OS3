
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBwInk54kZU5oyO1bwcdYFulwxG2gN_aRI",
  authDomain: "tukenes-e7997.firebaseapp.com",
  databaseURL: "https://tukenes-e7997-default-rtdb.firebaseio.com",
  projectId: "tukenes-e7997",
  storageBucket: "tukenes-e7997.firebasestorage.app",
  messagingSenderId: "443647587301",
  appId: "1:443647587301:web:db58d113371890705f750c"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

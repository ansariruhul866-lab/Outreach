import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyB3ba6NW9DFGxYZmD1ZX6OUMyEEk45ipL8",
  authDomain: "outreach-71a0c.firebaseapp.com",
  projectId: "outreach-71a0c",
  storageBucket: "outreach-71a0c.firebasestorage.app",
  messagingSenderId: "670213371259",
  appId: "1:670213371259:web:66282ab5d8a585d562f9de",
  measurementId: "G-QWMVQHPEJB"
};

// Initialize Firebase once
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Standard clean Google Auth Provider (No sensitive scope warnings)
export const googleProvider = new GoogleAuthProvider();

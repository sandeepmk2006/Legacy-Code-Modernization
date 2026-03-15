import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBtpCOd4yM0NSvPWwwloMdOpbr3iCzF1RU",
  authDomain: "legacy-code-dafa6.firebaseapp.com",
  projectId: "legacy-code-dafa6",
  storageBucket: "legacy-code-dafa6.firebasestorage.app",
  messagingSenderId: "669070610598",
  appId: "1:669070610598:web:7c7839b5f9a5ac7fbd2467",
  measurementId: "G-0GT963MCQ3"
};

const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

export const logoutGoogle = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";

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
export const authInitPromise = setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Error setting Firebase auth persistence:", error);
});

export const signInWithGoogle = async () => {
  try {
    await authInitPromise;
    await signInWithRedirect(auth, googleProvider);
    return null;
  } catch (error) {
    console.error("Error starting Google redirect sign-in:", error);
    throw error;
  }
};

export const getGoogleRedirectUser = async () => {
  try {
    await authInitPromise;
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  } catch (error) {
    console.error("Error processing Google redirect sign-in:", error);
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
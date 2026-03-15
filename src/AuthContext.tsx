import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, getGoogleRedirectUser } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const processRedirect = async () => {
      try {
        // This will only return a user on the redirect page, otherwise null.
        await getGoogleRedirectUser();
      } catch (error) {
        console.error("Error processing redirect result in AuthProvider:", error);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (isMounted) {
        setUser(firebaseUser);
        setLoading(false);
      }
    });

    processRedirect().finally(() => {
      // The onAuthStateChanged listener above will handle setting the user
      // and loading state correctly after the redirect is processed.
      // We just need to make sure we attempt to process it.
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const value = { user, loading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};

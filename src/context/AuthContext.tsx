import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, FirebaseUser, onAuthStateChanged, doc, onSnapshot } from '../firebase';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: any | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currUser) => {
      // Clean up previous profile listener
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      setUser(currUser);

      if (currUser) {
        const userRef = doc(db, 'users', currUser.uid);
        unsubProfile = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setUserProfile(snap.data());
          } else {
            // Profile doc might not exist yet during sign-up
            setUserProfile({
              uid: currUser.uid,
              email: currUser.email,
              displayName: currUser.displayName || '',
              role: 'student',
            });
          }
          setLoading(false);
        }, (error) => {
          console.error("Error loading user profile:", error);
          // Set a fallback profile to prevent the UI from blocking if firestore read fails
          setUserProfile({
            uid: currUser.uid,
            email: currUser.email,
            displayName: currUser.displayName || '',
            role: 'student',
          });
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubProfile) {
        unsubProfile();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, FirebaseUser, onAuthStateChanged, doc, onSnapshot, setDoc } from '../firebase';

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
        unsubProfile = onSnapshot(userRef, async (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (!data.activePlan) {
              const updatedProfile = {
                ...data,
                activePlan: 'Free Plan',
                activePlanPrice: '0 DA',
                hasPlan: true,
                subscribed: false,
              };
              setUserProfile(updatedProfile);
              try {
                await setDoc(userRef, {
                  activePlan: 'Free Plan',
                  activePlanPrice: '0 DA',
                  hasPlan: true,
                  subscribed: false,
                }, { merge: true });
              } catch (e) {
                console.error("Failed to persist Free Plan to Firestore: ", e);
              }
            } else {
              setUserProfile(data);
            }
          } else {
            // Profile doc might not exist yet during sign-up
            const isAdminEmail = currUser.email && currUser.email.toLowerCase() === 'aminerouabhia14@gmail.com';
            const defaultProfile = {
              uid: currUser.uid,
              email: currUser.email,
              displayName: currUser.displayName || '',
              role: isAdminEmail ? 'admin' : 'student',
              activePlan: 'Free Plan',
              activePlanPrice: '0 DA',
              hasPlan: true,
              subscribed: false,
            };
            setUserProfile(defaultProfile);
            try {
              await setDoc(userRef, defaultProfile, { merge: true });
            } catch (e) {
              console.error("Failed to initialize profile in Firestore: ", e);
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("Error loading user profile:", error);
          // Set a fallback profile to prevent the UI from blocking if firestore read fails
          const isAdminEmail = currUser.email && currUser.email.toLowerCase() === 'aminerouabhia14@gmail.com';
          setUserProfile({
            uid: currUser.uid,
            email: currUser.email,
            displayName: currUser.displayName || '',
            role: isAdminEmail ? 'admin' : 'student',
            activePlan: 'Free Plan',
            activePlanPrice: '0 DA',
            hasPlan: true,
            subscribed: false,
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

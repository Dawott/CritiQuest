import { useEffect, useState } from 'react';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { useAtom } from 'jotai';
import AuthService from '../services/firebase/auth.service';
import DatabaseService from '../services/firebase/database.service';
import { currentUserAtom } from '../../../client/src/store/atoms';

export function useAuthState() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [user, setUser] = useAtom(currentUserAtom);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subskrybcja do Firebase'a
    const unsubscribeAuth = AuthService.onAuthStateChanged(async (authUser) => {
      setFirebaseUser(authUser);
      
      if (authUser) {
        // Feczuj dane
        try {
          const userData = await DatabaseService.getUser(authUser.uid);
          setUser(userData);
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return unsubscribeAuth;
  }, [setUser]);

  useEffect(() => {
    // Subskrybuj do danych usera
    if (!firebaseUser) return;

    const unsubscribeUser = DatabaseService.subscribeToUser(
      firebaseUser.uid,
      (userData) => {
        if (userData) {
          setUser(userData);
        }
      }
    );

    return unsubscribeUser;
  }, [firebaseUser, setUser]);

  return {
    user,
    firebaseUser,
    loading,
    isAuthenticated: !!user,
  };
}
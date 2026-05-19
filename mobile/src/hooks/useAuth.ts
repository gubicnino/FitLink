import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { User } from '../types/types';

interface AuthState {
  firebaseUser: FirebaseAuthTypes.User | null;
  user: User | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    user: null,
    loading: true,
  });

  useEffect(() => {
    console.log('useAuth: mounting, setting up listener');
    
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      console.log('onAuthStateChanged fired:', firebaseUser?.uid ?? 'null');
      
      if (!firebaseUser) {
        console.log('No firebase user, setting unauthenticated state');
        setState({ firebaseUser: null, user: null, loading: false });
        return;
      }

      console.log('Firebase user found, fetching user from API...');
      const user = await authService.getUser();
      console.log('API user result:', JSON.stringify(user));
      
      setState({ firebaseUser, user, loading: false });
    });

    return unsubscribe;
  }, []);

  return state;
}
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
    
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      
      if (!firebaseUser) {
        setState({ firebaseUser: null, user: null, loading: false });
        return;
      }

      const user = await authService.getUser();
      
      setState({ firebaseUser, user, loading: false });
    });

    return unsubscribe;
  }, []);

  return state;
}
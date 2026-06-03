import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import apiClient from '../api/apiClient';
import type { User } from '../types/types';
import { auth } from './firebaseConfig';


export const authService = {

  login: async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  logout: async () => {
    await signOut(auth);
  },

  getToken: async (): Promise<string | null> => {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  },
  getUser: async (): Promise<User | null> => {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return null;

      const res = await apiClient.get('/auth/me')

      return res.data as User;
    } catch (error) {
      console.error('authService.getUser error:', error);
      return null;
    }

  },
  googleSignin: async () => {
    // Sign in with Google using Firebase Authentication
    try {
      const provider = new GoogleAuthProvider();

      const result = await signInWithPopup(auth, provider);

      return result.user;
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }
};
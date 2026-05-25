// src/services/authService.ts
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut } from '@react-native-firebase/auth';
import apiClient from '../api/apiClient';
import { liveSessionStorage } from '../utils/liveSessionStorage';
import { User } from '../types/types';

export const authService = {
  register: async (email: string, password: string) => {
    const auth = getAuth();
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  login: async (email: string, password: string) => {
    const auth = getAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  logout: async () => {
    const auth = getAuth();
    const uid = auth.currentUser?.uid;
    // Clear current user's live workout BEFORE signOut so we still know who it
    // belonged to. Also wipe ALL user-scoped live sessions so a
    // shared device cannot leak previous accounts workouts na drugi racun (ce se loggamo in v drug account)
    if (uid) {
      await liveSessionStorage.clear(uid).catch(() => {});
    }
    await liveSessionStorage.clearAllUsers().catch(() => {});
    await signOut(auth);
  },

  getToken: async (): Promise<string | null> => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  },
  getUser: async (): Promise<User | null> => {
    try {
      const auth = getAuth();
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return null;

      const token = await firebaseUser.getIdToken();

      const res = await apiClient.get('/auth/me')

      return res.data as User;
    } catch (error) {
      console.error('authService.getUser error:', error);
      return null;
    }
  },

};
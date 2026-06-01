// src/services/authService.ts
import { createUserWithEmailAndPassword, getAuth, GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword, signOut } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import apiClient from '../api/apiClient';
import { User } from '../types/types';
import { liveSessionStorage } from '../utils/liveSessionStorage';

let registrationInProgress = false;

const setRegistrationInProgress = (value: boolean) => {
  registrationInProgress = value;
};

type GoogleAuthResult = {
  user: Awaited<ReturnType<typeof getAuth>>['currentUser'];
  googleName: string | null;
};

const extractGoogleName = (signInResult: Awaited<ReturnType<typeof GoogleSignin.signIn>>) => {
  if (signInResult.type !== 'success' || !signInResult.data) {
    return null;
  }

  const googleUser = (signInResult.data as { user?: { name?: string | null } }).user;
  return googleUser?.name?.trim() ?? null;
};

export const authService = {
  beginRegistration: () => setRegistrationInProgress(true),
  endRegistration: () => setRegistrationInProgress(false),
  isRegistrationInProgress: () => registrationInProgress,

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
      await liveSessionStorage.clear(uid).catch(() => { });
    }
    await liveSessionStorage.clearAllUsers().catch(() => { });
    // Drop the FCM token on the backend so we stop pushing to a device
    // that may be picked up by the next account that logs in here.

    try {
      const apiClient = (await import('../api/apiClient')).default;
      await apiClient.delete('/user/me/fcm-token');
    } catch (err) {
      console.warn('[authService] FCM token clear failed', err);
    }
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
  getGoogleUser: async () => {
    // Check Play services (Android) and start sign-in
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const signInResult = await GoogleSignin.signIn();

    // Ensure sign-in succeeded
    if (signInResult.type !== 'success' || !signInResult.data) {
      throw new Error('Google sign-in cancelled');
    }

    // Extract ID token
    const idToken = signInResult.data.idToken ?? (signInResult as any).idToken ?? null;
    if (!idToken) {
      throw new Error('No ID token found');
    }

    // Create a Google credential with the token and sign in to Firebase
    const googleCredential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(getAuth(), googleCredential);
    return userCredential.user;
  },

  getGoogleAuth: async (): Promise<GoogleAuthResult> => {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const signInResult = await GoogleSignin.signIn();

    if (signInResult.type !== 'success' || !signInResult.data) {
      throw new Error('Google sign-in cancelled');
    }

    const googleName = extractGoogleName(signInResult);
    const idToken = signInResult.data.idToken ?? (signInResult as any).idToken ?? null;
    if (!idToken) {
      throw new Error('No ID token found');
    }

    const googleCredential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(getAuth(), googleCredential);

    return {
      user: userCredential.user,
      googleName,
    };
  },

};
import { useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import auth from '@react-native-firebase/auth';
import messaging from '@react-native-firebase/messaging';
import apiClient from '../api/apiClient';


export function useFcmRegistration() {
  useEffect(() => {
    let cancelled = false;
    let tokenRefreshUnsub: (() => void) | null = null;

    async function ensurePermission() {
      if (Platform.OS !== 'android') return;
      if (Platform.Version < 33) return;
      try {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
      } catch (err) {
        console.warn('[fcm] permission request failed', err);
      }
    }

    async function uploadToken(token: string) {
      try {
        await apiClient.put('/user/me/fcm-token', { token });
      } catch (err) {
        console.warn('[fcm] token upload failed', err);
      }
    }

    async function registerOnce() {
      try {
        const token = await messaging().getToken();
        if (cancelled || !token) return;
        await uploadToken(token);
      } catch (err) {
        console.warn('[fcm] getToken failed', err);
      }
    }

    const authUnsub = auth().onAuthStateChanged(async user => {
      if (!user) {
        if (tokenRefreshUnsub) {
          tokenRefreshUnsub();
          tokenRefreshUnsub = null;
        }
        return;
      }
      await ensurePermission();
      await registerOnce();
      // Firebase can rotate the token at any time (app reinstall, data wipe,
      // long inactivity). Telko ka keepamo backend in sync.
      tokenRefreshUnsub = messaging().onTokenRefresh(token => {
        if (token) uploadToken(token);
      });
    });

    return () => {
      cancelled = true;
      authUnsub();
      if (tokenRefreshUnsub) tokenRefreshUnsub();
    };
  }, []);
}

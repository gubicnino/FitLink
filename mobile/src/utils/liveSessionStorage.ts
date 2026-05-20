// Ce user zacne nov workout dokler je se ena aktivna, prikazemo recovery prompt
// (handled v useLiveSession hook-u, ne tu)

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LiveSessionState } from '../types/workout';

const STORAGE_KEY = 'fitlink.liveSession.v1';

export const liveSessionStorage = {
  async load(): Promise<LiveSessionState | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as LiveSessionState;
      if (parsed.version !== 1) {
        await AsyncStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch (err) {
      console.warn('[liveSessionStorage] failed to load, clearing', err);
      await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
      return null;
    }
  },

  async save(state: LiveSessionState): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};

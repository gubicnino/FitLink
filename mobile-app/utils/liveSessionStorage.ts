import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LiveSessionState } from '../types/workout';

/**
 * Preventamo da ce en user zacne workout, se logga out (brez da zakjljuci workout), se ta ne
 * prenese na novega userja ko se logga in. Sepravi je Firebase UID specific.
 */

const KEY_PREFIX = 'fitlink.liveSession.v1';
const LEGACY_KEY = KEY_PREFIX;

function userKey(userId: string): string {
  return `${KEY_PREFIX}.${userId}`;
}

async function purgeLegacyIfPresent(): Promise<void> {
  try {
    const legacy = await AsyncStorage.getItem(LEGACY_KEY);
    if (legacy != null) {
      await AsyncStorage.removeItem(LEGACY_KEY);
    }
  } catch {
    // to nescemo ka se nikole throwa. Storage purge je best effort
  }
}

async function clearAllUserScopedKeys(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter(k => k.startsWith(`${KEY_PREFIX}.`));
    if (ours.length > 0) {
      await AsyncStorage.multiRemove(ours);
    }
  } catch {
  }
}

export const liveSessionStorage = {
  async load(userId: string): Promise<LiveSessionState | null> {
    await purgeLegacyIfPresent();
    try {
      const raw = await AsyncStorage.getItem(userKey(userId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as LiveSessionState;
      if (parsed.version !== 1) {
        await AsyncStorage.removeItem(userKey(userId));
        return null;
      }
      return parsed;
    } catch (err) {
      console.warn('[liveSessionStorage] failed to load, clearing', err);
      await AsyncStorage.removeItem(userKey(userId)).catch(() => {});
      return null;
    }
  },

  async save(userId: string, state: LiveSessionState): Promise<void> {
    await AsyncStorage.setItem(userKey(userId), JSON.stringify(state));
  },

  async clear(userId: string): Promise<void> {
    await AsyncStorage.removeItem(userKey(userId));
  },


  // Wipe ALL users live sessions (used on logout as defense-in-depth).
  async clearAllUsers(): Promise<void> {
    await purgeLegacyIfPresent();
    await clearAllUserScopedKeys();
  },
};

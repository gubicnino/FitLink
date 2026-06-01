import { useEffect } from 'react';
import { Alert } from 'react-native';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { navigationRef } from '../navigation/RootNavigator';
import { triggerHealthSync } from '../services/healthSyncService';


export function useFcmHandlers() {
  useEffect(() => {
    function route(remote: FirebaseMessagingTypes.RemoteMessage | null) {
      if (!remote) return;
      const data = remote.data ?? {};
      if (
        data.route === 'chat' &&
        typeof data.conversationId === 'string' &&
        data.conversationId.length > 0 &&
        navigationRef.isReady()
      ) {
        navigationRef.navigate('ChatThread', { conversationId: data.conversationId });
      }
    }

    function isViewingConversation(conversationId: string): boolean {
      if (!navigationRef.isReady()) return false;
      const current = navigationRef.getCurrentRoute();
      if (!current || current.name !== 'ChatThread') return false;
      const params = current.params as { conversationId?: string } | undefined;
      return params?.conversationId === conversationId;
    }

    // (1) Foreground
    const unsubForeground = messaging().onMessage(async remote => {
      const data = remote.data ?? {};

      // Trainer-initiated remote refresh. The trainee's screen does
      // not need to know; we just push a fresh snapshot upstream and let
      // the trainer's getForClient poll pick it up.
      if (data.type === 'health_sync_request') {
        triggerHealthSync();
        return;
      }

      if (
        data.route === 'chat' &&
        typeof data.conversationId === 'string' &&
        isViewingConversation(data.conversationId)
      ) {
        return;
      }
      const title = remote.notification?.title ?? 'Notification';
      const body = remote.notification?.body ?? '';
      Alert.alert(title, body, [
        { text: 'Dismiss', style: 'cancel' },
        { text: 'Open', onPress: () => route(remote) },
      ]);
    });

    // (2) Background tap
    const unsubBackground = messaging().onNotificationOpenedApp(remote => {
      route(remote);
    });

    // (3) Cold start tap
    messaging()
      .getInitialNotification()
      .then(remote => {
        if (remote) route(remote);
      })
      .catch(err => console.warn('[fcm] getInitialNotification failed', err));

    return () => {
      unsubForeground();
      unsubBackground();
    };
  }, []);
}

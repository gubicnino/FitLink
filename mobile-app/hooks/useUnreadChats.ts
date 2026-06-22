import { useEffect, useState } from 'react';
import auth from '@/services/firebaseAuthCompat';
import { chatApi } from '../api/chatApi';
import { useChatSocket } from './useChatSocket';
import { chatUnreadBus } from '../utils/chatUnreadBus';

/**
 * Tracks total unread message count across all conversations for the current
 * user. Refresha se na:
 *   - initial mount / auth change
 *   - any incoming STOMP message
 *   - any conversation update frame (mark-read from another device
 *
 * Returned count se te uporabe za renderanje badgea on the Chat bottom-tab.
 */
export function useUnreadChats() {
  const [total, setTotal] = useState(0);

  async function refresh() {
    if (!auth().currentUser) {
      setTotal(0);
      return;
    }
    try {
      const conversations = await chatApi.listConversations();
      const sum = conversations.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0);
      setTotal(sum);
    } catch {
      // Rajse pustimo prejsnji count kak ka bi zero nastavile, da ne bo ikona skakala gor-doj ob vsakem errorju.
    }
  }

  useEffect(() => {
    refresh();
    const unsubAuth = auth().onAuthStateChanged(() => {
      refresh();
    });
    const unsubBus = chatUnreadBus.subscribe(() => refresh());
    return () => {
      unsubAuth();
      unsubBus();
    };
  }, []);

  useChatSocket({
    onMessage: () => refresh(),
    onConversationUpdate: () => refresh(),
  });

  return total;
}

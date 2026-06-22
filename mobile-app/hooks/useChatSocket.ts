import { useEffect, useRef, useState } from 'react';
import { Client, IFrame, IMessage, StompSubscription } from '@stomp/stompjs';
import auth from '@/services/firebaseAuthCompat';
import { API_ORIGIN } from '../api/apiClient';
import type {
  MessageResponse,
  ReadReceiptDto,
  TypingDto,
} from '../types/chat';

/**
 * Module-scoped singleton STOMP client. Multiple components (ChatList +
 * ChatThread, etc.) sharajo EDEN connection - otherwise every mount creates
 * its own Client and the backend ends up with N parallel sessions per user.
 *
 * Vsak component subscriba prek {@link useChatSocket} with its callbacks;
 */

export interface ChatSocketCallbacks {
  onMessage?: (msg: MessageResponse) => void;
  onReadReceipt?: (receipt: ReadReceiptDto) => void;
  onTyping?: (typing: TypingDto) => void;
  onConversationUpdate?: (conversationId: string) => void;
}

export type ChatSocketStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'closed';

const WS_URL = API_ORIGIN.replace(/^http/, 'ws') + '/ws';


interface CallbackEntry { id: number; cb: ChatSocketCallbacks; }

const registry: CallbackEntry[] = [];
let nextId = 1;

let sharedClient: Client | null = null;
let sharedStatus: ChatSocketStatus = 'idle';
const statusListeners: ((s: ChatSocketStatus) => void)[] = [];
let authUnsubscribe: (() => void) | null = null;

function notifyStatus(next: ChatSocketStatus) {
  sharedStatus = next;
  for (const l of statusListeners) l(next);
}

function ensureClient() {
  if (sharedClient) return sharedClient;

  const client = new Client({

    forceBinaryWSFrames: true,
    appendMissingNULLonIncoming: true,
    webSocketFactory: () => {
      console.warn('[STOMP] webSocketFactory called, opening', WS_URL);
      try {
        const ws = new WebSocket(WS_URL);
        ws.addEventListener('open', () => console.warn('[STOMP] WS open event'));
        ws.addEventListener('close', (e: any) => console.warn('[STOMP] WS close event', e?.code, e?.reason));
        ws.addEventListener('error', e => console.warn('[STOMP] WS error event', e));
        return ws;
      } catch (err) {
        console.warn('[STOMP] WebSocket constructor threw', err);
        throw err;
      }
    },
    reconnectDelay: 5000,
    heartbeatIncoming: 10_000,
    heartbeatOutgoing: 10_000,
    beforeConnect: async () => {
      console.warn('[STOMP] beforeConnect fired — fetching token');
      try {
        const user = auth().currentUser;
        if (!user) {
          console.warn('[STOMP] no currentUser, deactivating');
          client.deactivate();
          return;
        }
        const token = await user.getIdToken(true);
        console.warn('[STOMP] token obtained, length=', token.length, 'wsURL=', WS_URL);
        client.connectHeaders = { Authorization: `Bearer ${token}` };
      } catch (err) {
        console.warn('[STOMP] token refresh failed', err);
      }
    },
    debug: (msg: string) => {
      console.warn('[STOMP]', msg);
    },
  });

  client.onConnect = () => {
    const uid = auth().currentUser?.uid;
    if (!uid) {
      console.warn('[STOMP] connected but no Firebase uid; aborting subscriptions');
      return;
    }
    const base = `/topic/user.${uid}`;
    console.warn('[STOMP] CONNECT success, subscribing to', base + '/queue/*');
    notifyStatus('connected');

    const subs: StompSubscription[] = [];
    subs.push(client.subscribe(`${base}/queue/messages`, (frame: IMessage) => {
      console.warn('[STOMP] received /queue/messages frame, body length=', frame.body?.length);
      const payload = safeParse<MessageResponse>(frame.body);
      if (!payload) {
        console.warn('[STOMP] failed to parse message payload');
        return;
      }
      console.warn('[STOMP] dispatching message to', registry.length, 'listeners');
      for (const e of registry) e.cb.onMessage?.(payload);
    }));
    subs.push(client.subscribe(`${base}/queue/read-receipts`, (frame: IMessage) => {
      const payload = safeParse<ReadReceiptDto>(frame.body);
      if (!payload) return;
      for (const e of registry) e.cb.onReadReceipt?.(payload);
    }));
    subs.push(client.subscribe(`${base}/queue/typing`, (frame: IMessage) => {
      const payload = safeParse<TypingDto>(frame.body);
      if (!payload) return;
      for (const e of registry) e.cb.onTyping?.(payload);
    }));
    subs.push(client.subscribe(`${base}/queue/conv-updates`, (frame: IMessage) => {
      const payload = safeParse<{ conversationId: string }>(frame.body);
      if (!payload) return;
      for (const e of registry) e.cb.onConversationUpdate?.(payload.conversationId);
    }));

    (client as Client & { _subs?: StompSubscription[] })._subs = subs;
  };

  client.onStompError = (frame: IFrame) => {
    console.warn('[chatSocket] STOMP error', frame.headers['message'], frame.body);
    notifyStatus('error');
  };
  client.onWebSocketClose = () => notifyStatus('closed');
  client.onWebSocketError = err => {
    console.warn('[chatSocket] WS error', err);
    notifyStatus('error');
  };


  if (!authUnsubscribe) {
    authUnsubscribe = auth().onAuthStateChanged(user => {
      console.warn('[STOMP] auth state changed, user=', user?.uid ?? 'null', 'active=', client.active);
      if (user && !client.active) {
        console.warn('[STOMP] activating client');
        notifyStatus('connecting');
        client.activate();
      } else if (!user && client.active) {
        console.warn('[STOMP] deactivating client');
        client.deactivate();
      }
    });
  }

  if (auth().currentUser && !client.active) {
    console.warn('[STOMP] already signed in — activating');
    notifyStatus('connecting');
    client.activate();
  }

  sharedClient = client;
  return client;
}


export function useChatSocket(callbacks: ChatSocketCallbacks) {
  const [status, setStatus] = useState<ChatSocketStatus>(sharedStatus);
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  useEffect(() => {
    ensureClient();

    const entry: CallbackEntry = {
      id: nextId++,
      cb: {
        onMessage: m => cbRef.current.onMessage?.(m),
        onReadReceipt: r => cbRef.current.onReadReceipt?.(r),
        onTyping: t => cbRef.current.onTyping?.(t),
        onConversationUpdate: c => cbRef.current.onConversationUpdate?.(c),
      },
    };
    registry.push(entry);

    const onStatus = (s: ChatSocketStatus) => setStatus(s);
    statusListeners.push(onStatus);

    return () => {
      const ri = registry.findIndex(e => e.id === entry.id);
      if (ri >= 0) registry.splice(ri, 1);
      const si = statusListeners.indexOf(onStatus);
      if (si >= 0) statusListeners.splice(si, 1);
    };
  }, []);

  function publishTyping(conversationId: string, isTyping: boolean) {
    const c = sharedClient;
    if (!c || !c.connected) return;
    c.publish({
      destination: `/app/conv.${conversationId}/typing`,
      body: JSON.stringify({ isTyping }),
    });
  }

  function publishSeen(conversationId: string, messageId: string) {
    const c = sharedClient;
    if (!c || !c.connected) return;
    c.publish({
      destination: `/app/conv.${conversationId}/seen`,
      body: JSON.stringify({ messageId }),
    });
  }

  return { status, publishTyping, publishSeen };
}

function safeParse<T>(body: string): T | null {
  try { return JSON.parse(body) as T; } catch { return null; }
}

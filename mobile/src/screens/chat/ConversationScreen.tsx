import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image as RNImage,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  ViewToken,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Check,
  CheckCheck,
  ChevronLeft,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Send,
  X,
} from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { errorCodes, isErrorWithCode, pick, types } from '@react-native-documents/picker';
import { colors, radii, spacing } from '../../theme';
import { IconButton, Screen, Text } from '../../components/ui';
import { ScreenHeader } from '../../components/layout';
import { API_ORIGIN } from '../../api/apiClient';
import { chatApi } from '../../api/chatApi';
import { useChatSocket } from '../../hooks/useChatSocket';
import type {
  AttachmentDto,
  ConversationResponse,
  LocalMessage,
  MessageResponse,
} from '../../types/chat';
import type { RootStackParamList } from '../../navigation/types';
import { chatUnreadBus } from '../../utils/chatUnreadBus';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ChatThread'>;

const PAGE_SIZE = 50;
const TYPING_THROTTLE_MS = 2000;


// 1:1 chat thread, najnovejsi chat je najnizje
export function ConversationScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const conversationId = route.params.conversationId;

  const currentUid = auth().currentUser?.uid ?? '';

  const [conversation, setConversation] = useState<ConversationResponse | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [attachSheetOpen, setAttachSheetOpen] = useState(false);

  const typingLastSentRef = useRef<number>(0);
  const peerTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReadSentRef = useRef<string | null>(null);

  // Initial load
  const loadInitial = useCallback(async () => {
    try {
      const [conv, msgs] = await Promise.all([
        chatApi.getConversation(conversationId),
        chatApi.listMessages(conversationId, { limit: PAGE_SIZE }),
      ]);
      setConversation(conv);
      setMessages(msgs.map(toLocalMessage));
      setHasMore(msgs.length === PAGE_SIZE);

      const newestIncoming = msgs.find(m => m.senderId !== currentUid);
      if (newestIncoming) {
        chatApi.markRead(conversationId, { messageId: newestIncoming.id })
          .then(() => chatUnreadBus.emit())
          .catch(err => console.warn('[ConversationScreen] markRead failed', err));
      }
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setLoading(false);
    }
  }, [conversationId, currentUid]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  // STOMP listeners scoped za SAMO ta conversation
  const { publishTyping, publishSeen } = useChatSocket({
    onMessage: incoming => {
      if (incoming.conversationId !== conversationId) return;
      setMessages(prev => mergeIncoming(prev, incoming));
      // Auto-mark read for messages that arrive while we are looking at
      // the thread.
      // Brez tega bi se tudi ob zapiranju in ponovnem odpiranju threada kazalo sporočilo kot unread, če je medtem prišlo novo sporočilo.
      if (incoming.senderId !== currentUid) {
        chatApi.markRead(conversationId, { messageId: incoming.id })
          .then(() => chatUnreadBus.emit())
          .catch(err => console.warn('[ConversationScreen] auto-markRead failed', err));
      }
    },
    onReadReceipt: receipt => {
      if (receipt.conversationId !== conversationId) return;
      setConversation(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map(p =>
            p.userId === receipt.readerUserId
              ? { ...p, lastReadMessageId: receipt.lastReadMessageId, lastReadAt: receipt.readAt }
              : p,
          ),
        };
      });
    },
    onTyping: t => {
      if (t.conversationId !== conversationId) return;
      if (t.typingUserId === currentUid) return;
      setPeerTyping(t.isTyping);
      if (peerTypingTimerRef.current) clearTimeout(peerTypingTimerRef.current);
      if (t.isTyping) {
        peerTypingTimerRef.current = setTimeout(() => setPeerTyping(false), 4000);
      }
    },
  });

  useEffect(() => {
    return () => {
      if (peerTypingTimerRef.current) clearTimeout(peerTypingTimerRef.current);
    };
  }, []);

  // Send (optimistic), sepravi real time.
  const onSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending || conversation?.readOnly) return;

    const clientMessageId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: LocalMessage = {
      id: `optimistic-${clientMessageId}`,
      conversationId,
      senderId: currentUid,
      clientMessageId,
      type: 'TEXT',
      text,
      attachments: [],
      sentAt: new Date().toISOString(),
      editedAt: null,
      deletedAt: null,
      systemEvent: null,
      status: 'sending',
    };
    setMessages(prev => [optimistic, ...prev]);
    setDraft('');
    setSending(true);

    try {
      const saved = await chatApi.sendMessage(conversationId, { clientMessageId, text });
      setMessages(prev =>
        prev.map(m =>
          m.clientMessageId === clientMessageId
            ? { ...toLocalMessage(saved), status: 'sent' }
            : m,
        ),
      );
    } catch (err) {
      setMessages(prev =>
        prev.map(m => (m.clientMessageId === clientMessageId ? { ...m, status: 'failed' } : m)),
      );
      console.warn('[ConversationScreen] send failed', extractMessage(err));
    } finally {
      setSending(false);
    }
  }, [draft, sending, conversationId, currentUid, conversation?.readOnly]);

  /**
   * Upload + send an attachment as its own message. Optimistic
   */
  const sendAttachmentMessage = useCallback(
    async (file: { uri: string; name: string; type: string }) => {
      if (sending || conversation?.readOnly) return;

      const clientMessageId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const optimistic: LocalMessage = {
        id: `optimistic-${clientMessageId}`,
        conversationId,
        senderId: currentUid,
        clientMessageId,
        type: 'ATTACHMENT',
        text: null,
        attachments: [
          {
            id: `pending-${clientMessageId}`,
            kind: file.type.startsWith('image/') ? 'IMAGE' : 'OTHER',
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: 0,
            downloadUrl: file.uri,
            thumbnailUrl: file.type.startsWith('image/') ? file.uri : null,
          },
        ],
        sentAt: new Date().toISOString(),
        editedAt: null,
        deletedAt: null,
        systemEvent: null,
        status: 'sending',
      };
      setMessages(prev => [optimistic, ...prev]);
      setSending(true);

      try {
        const uploaded: AttachmentDto = await chatApi.uploadAttachment(file);
        const saved = await chatApi.sendMessage(conversationId, {
          clientMessageId,
          attachments: [{ attachmentId: uploaded.id }],
        });
        setMessages(prev =>
          prev.map(m =>
            m.clientMessageId === clientMessageId
              ? { ...toLocalMessage(saved), status: 'sent' }
              : m,
          ),
        );
      } catch (err) {
        setMessages(prev =>
          prev.map(m => (m.clientMessageId === clientMessageId ? { ...m, status: 'failed' } : m)),
        );
        Alert.alert('Upload failed', extractMessage(err));
      } finally {
        setSending(false);
      }
    },
    [sending, conversation?.readOnly, conversationId, currentUid],
  );

  const onPickImage = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        includeBase64: false,
      });
      if (result.didCancel || !result.assets || result.assets.length === 0) return;
      const a = result.assets[0];
      if (!a.uri) return;
      await sendAttachmentMessage({
        uri: a.uri,
        name: a.fileName ?? `image-${Date.now()}.jpg`,
        type: a.type ?? 'image/jpeg',
      });
    } catch (err) {
      Alert.alert('Could not pick image', extractMessage(err));
    }
  }, [sendAttachmentMessage]);

  const onPickDocument = useCallback(async () => {
    try {
      const [picked] = await pick({
        type: [types.pdf, types.docx, types.doc, types.xlsx, types.xls, types.plainText],
        allowMultiSelection: false,
      });
      if (!picked) return;
      await sendAttachmentMessage({
        uri: picked.uri,
        name: picked.name ?? 'document',
        type: picked.type ?? 'application/octet-stream',
      });
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return;
      Alert.alert('Could not pick document', extractMessage(err));
    }
  }, [sendAttachmentMessage]);

  const onAttachPress = useCallback(() => setAttachSheetOpen(true), []);
  const onSheetPickImage = useCallback(() => {
    setAttachSheetOpen(false);
    onPickImage();
  }, [onPickImage]);
  const onSheetPickDocument = useCallback(() => {
    setAttachSheetOpen(false);
    onPickDocument();
  }, [onPickDocument]);

  const onDraftChange = useCallback(
    (next: string) => {
      setDraft(next);
      const now = Date.now();
      if (now - typingLastSentRef.current > TYPING_THROTTLE_MS) {
        typingLastSentRef.current = now;
        publishTyping(conversationId, next.length > 0);
      }
    },
    [conversationId, publishTyping],
  );

  // Pagination
  const onLoadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    const oldest = messages[messages.length - 1];
    setLoadingOlder(true);
    try {
      const older = await chatApi.listMessages(conversationId, {
        before: oldest.sentAt,
        limit: PAGE_SIZE,
      });
      setMessages(prev => [...prev, ...older.map(toLocalMessage)]);
      setHasMore(older.length === PAGE_SIZE);
    } catch (err) {
      console.warn('[ConversationScreen] loadOlder failed', err);
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, messages, hasMore, loadingOlder]);

  // Read receipts preko FlatList viewability
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const visibleIncoming = viewableItems
      .map(v => v.item as LocalMessage)
      .filter(m => m.senderId !== currentUid && !m.id.startsWith('optimistic-'));
    if (visibleIncoming.length === 0) return;
    const newest = visibleIncoming[0];
    if (lastReadSentRef.current === newest.id) return;
    lastReadSentRef.current = newest.id;
    publishSeen(conversationId, newest.id);
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const peerName = useMemo(() => {
    if (!conversation) return '';
    const peer = conversation.participants.find(p => p.userId !== currentUid);
    return peer?.displayName ?? 'Conversation';
  }, [conversation, currentUid]);

  // Used to render a single "Seen" marker on that bubble
  // Samo na zadnjon, nej na vsakon prejsnjon (ce je vido zadnjo -> je vido vse)
  const lastSeenMyMessageId = useMemo(() => {
    if (!conversation) return null;
    const peer = conversation.participants.find(p => p.userId !== currentUid);
    if (!peer?.lastReadAt) return null;
    const peerLastReadMs = new Date(peer.lastReadAt).getTime();
    // Prvi match je avtomatsko teh most recent one
    for (const m of messages) {
      if (m.senderId !== currentUid) continue;
      if (new Date(m.sentAt).getTime() <= peerLastReadMs) return m.id;
    }
    return null;
  }, [conversation, currentUid, messages]);

  if (loading) {
    return (
      <Screen edges={['top']}>
        <ScreenHeader
          title="Loading…"
          left={<IconButton variant="surface" withBorder onPress={() => navigation.goBack()}>
            <ChevronLeft size={18} color={colors.inkPrimary} strokeWidth={2.25} />
          </IconButton>}
        />
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </Screen>
    );
  }

  if (error || !conversation) {
    return (
      <Screen edges={['top']}>
        <ScreenHeader
          title="Conversation"
          left={<IconButton variant="surface" withBorder onPress={() => navigation.goBack()}>
            <ChevronLeft size={18} color={colors.inkPrimary} strokeWidth={2.25} />
          </IconButton>}
        />
        <View style={styles.center}>
          <Text variant="bodyLarge" color="danger" weight="600">Could not load chat</Text>
          <Text variant="bodySmall" color="secondary" align="center">{error}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        title={peerName}
        left={<IconButton variant="surface" withBorder onPress={() => navigation.goBack()}>
          <ChevronLeft size={18} color={colors.inkPrimary} strokeWidth={2.25} />
        </IconButton>}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <FlatList
          data={messages}
          keyExtractor={m => m.id}
          inverted
          contentContainerStyle={styles.list}
          onEndReached={onLoadOlder}
          onEndReachedThreshold={0.3}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          ListFooterComponent={loadingOlder ? (
            <View style={styles.olderLoader}><ActivityIndicator color={colors.primary} /></View>
          ) : null}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isMine={item.senderId === currentUid}
              showSeen={item.id === lastSeenMyMessageId}
            />
          )}
          keyboardShouldPersistTaps="handled"
        />

        {peerTyping ? (
          <View style={styles.typingRow}>
            <Text variant="micro" color="muted">{peerName} is typing…</Text>
          </View>
        ) : null}

        {conversation.readOnly ? (
          <View style={styles.readOnlyBar}>
            <Text variant="micro" color="muted" align="center">
              Read-only · {conversation.readOnlyReason ?? 'coaching ended'}
            </Text>
          </View>
        ) : (
          <View style={styles.inputBar}>
            <Pressable
              onPress={onAttachPress}
              disabled={sending}
              hitSlop={6}
              style={({ pressed }) => [styles.attachBtn, pressed && { opacity: 0.6 }]}
              accessibilityLabel="Attach file"
            >
              <Paperclip size={18} color={colors.inkSecondary} strokeWidth={2} />
            </Pressable>
            <TextInput
              value={draft}
              onChangeText={onDraftChange}
              placeholder="Message…"
              placeholderTextColor={colors.inkMuted}
              style={styles.textInput}
              multiline
              maxLength={4000}
            />
            <Pressable
              onPress={onSend}
              disabled={!draft.trim() || sending}
              hitSlop={6}
              style={({ pressed }) => [
                styles.sendBtn,
                (!draft.trim() || sending) && styles.sendBtnDisabled,
                pressed && { opacity: 0.7 },
              ]}
              accessibilityLabel="Send message"
            >
              <Send size={18} color={colors.white} strokeWidth={2.25} />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
      <AttachmentSheet
        visible={attachSheetOpen}
        onClose={() => setAttachSheetOpen(false)}
        onPickImage={onSheetPickImage}
        onPickDocument={onSheetPickDocument}
      />
    </Screen>
  );
}


function AttachmentSheet({
  visible,
  onClose,
  onPickImage,
  onPickDocument,
}: {
  visible: boolean;
  onClose: () => void;
  onPickImage: () => void;
  onPickDocument: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheetCard} onPress={() => {}}>
          <View style={styles.sheetGrabber} />
          <View style={styles.sheetHeader}>
            <Text variant="bodyLarge" weight="700" style={styles.sheetTitle}>
              Send attachment
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={({ pressed }) => [styles.sheetClose, pressed && { opacity: 0.6 }]}
              accessibilityLabel="Close"
            >
              <X size={18} color={colors.inkSecondary} strokeWidth={2.25} />
            </Pressable>
          </View>
          <View style={styles.sheetOptions}>
            <SheetOption
              icon={<ImageIcon size={22} color={colors.primary} strokeWidth={2} />}
              label="Photo"
              hint="From your library"
              onPress={onPickImage}
            />
            <SheetOption
              icon={<FileText size={22} color={colors.primary} strokeWidth={2} />}
              label="Document"
              hint="PDF, Word, Excel, text"
              onPress={onPickDocument}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SheetOption({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.sheetOption, pressed && styles.sheetOptionPressed]}
    >
      <View style={styles.sheetOptionIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text variant="body" weight="700" style={{ color: colors.inkPrimary }}>
          {label}
        </Text>
        <Text variant="bodySmall" style={{ color: colors.inkSecondary }}>
          {hint}
        </Text>
      </View>
    </Pressable>
  );
}

function MessageBubble({
  message,
  isMine,
  showSeen,
}: {
  message: LocalMessage;
  isMine: boolean;
  showSeen: boolean;
}) {
  const isDeleted = message.deletedAt != null;
  const isFailed = message.status === 'failed';
  const hasAttachments = !isDeleted && message.attachments && message.attachments.length > 0;
  const showStatusIcon = isMine && !isDeleted && message.status !== 'sending' && !isFailed;
  return (
    <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
      <View
        style={[
          styles.bubble,
          isMine ? styles.bubbleMine : styles.bubbleTheirs,
          isFailed && styles.bubbleFailed,
        ]}
      >
        {hasAttachments
          ? message.attachments.map(a => (
              <AttachmentPreview key={a.id} attachment={a} isMine={isMine} />
            ))
          : null}
        {message.text != null && message.text.length > 0 ? (
          <Text
            variant="bodySmall"
            style={[
              isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs,
              hasAttachments && { marginTop: 6 },
            ]}
          >
            {message.text}
          </Text>
        ) : null}
        {isDeleted ? (
          <Text variant="bodySmall" style={isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs}>
            Message deleted
          </Text>
        ) : null}
        <View style={[styles.bubbleMeta, isMine && styles.bubbleMetaMineRow]}>
          <Text variant="micro" style={isMine ? styles.bubbleMetaMine : styles.bubbleMetaTheirs}>
            {formatTime(message.sentAt)}
            {message.editedAt ? ' · edited' : ''}
            {isFailed ? ' · failed' : ''}
            {message.status === 'sending' ? ' · sending…' : ''}
          </Text>
          {showStatusIcon ? (
            showSeen ? (
              <CheckCheck size={12} color={colors.white} strokeWidth={2.5} style={styles.seenIcon} />
            ) : (
              <Check size={12} color="rgba(255,255,255,0.7)" strokeWidth={2.5} style={styles.seenIcon} />
            )
          ) : null}
        </View>
      </View>
    </View>
  );
}

// Attachment download URL is currently public (UUID is non-guessable
// V nadalnje bomo introducali short-lived signed URLs

function AttachmentPreview({
  attachment,
  isMine,
}: {
  attachment: LocalMessage['attachments'][number];
  isMine: boolean;
}) {
  const isImage = attachment.kind === 'IMAGE';
  const raw = attachment.downloadUrl ?? `/api/chat/attachments/${attachment.id}`;
  const isLocal = raw.startsWith('file:') || raw.startsWith('content:');
  const url = raw.startsWith('http') || isLocal ? raw : API_ORIGIN + raw;

  const openExternally = async () => {
    if (isLocal) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Cannot open file', 'No app on this device can open this file type.');
        return;
      }
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert('Cannot open file', extractMessage(err));
    }
  };

  if (isImage) {
    return (
      <Pressable onPress={openExternally} disabled={isLocal}>
        <RNImage source={{ uri: url }} style={styles.attachmentImage} resizeMode="cover" />
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={openExternally}
      disabled={isLocal}
      style={({ pressed }) => [styles.attachmentFile, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.attachmentFileIcon, isMine && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
        <FileText
          size={18}
          color={isMine ? colors.white : colors.primary}
          strokeWidth={2}
        />
      </View>
      <View style={styles.attachmentFileBody}>
        <Text
          variant="bodySmall"
          weight="700"
          numberOfLines={1}
          style={isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs}
        >
          {attachment.fileName}
        </Text>
        <Text
          variant="micro"
          style={isMine ? styles.bubbleMetaMine : styles.bubbleMetaTheirs}
        >
          {formatBytes(attachment.sizeBytes)}
        </Text>
      </View>
    </Pressable>
  );
}

function toLocalMessage(m: MessageResponse): LocalMessage {
  return { ...m, status: 'sent' };
}

function mergeIncoming(prev: LocalMessage[], incoming: MessageResponse): LocalMessage[] {
  const byClientId = incoming.clientMessageId
    ? prev.findIndex(m => m.clientMessageId === incoming.clientMessageId)
    : -1;
  if (byClientId >= 0) {
    const next = prev.slice();
    next[byClientId] = { ...toLocalMessage(incoming), status: 'sent' };
    return next;
  }
  if (prev.some(m => m.id === incoming.id)) return prev;
  return [toLocalMessage(incoming), ...prev];
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatBytes(n: number): string {
  if (!n || n <= 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function extractMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const resp = (err as { response?: { data?: { message?: string } } }).response;
    if (resp?.data?.message) return resp.data.message;
  }
  if (err instanceof Error) return err.message;
  return 'Unknown error';
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xxl },

  list: { paddingHorizontal: spacing.xxl, paddingVertical: spacing.lg, gap: spacing.sm },

  bubbleRow: { flexDirection: 'row', marginVertical: 2 },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
  },
  bubbleMine: { backgroundColor: colors.primary, borderTopRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.surfaceElevated, borderTopLeftRadius: 4 },
  bubbleFailed: { opacity: 0.6, borderWidth: 1, borderColor: colors.danger },
  bubbleTextMine: { color: colors.white },
  bubbleTextTheirs: { color: colors.inkPrimary },
  bubbleMeta: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
  bubbleMetaMineRow: { justifyContent: 'flex-end' },
  bubbleMetaMine: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  bubbleMetaTheirs: { color: colors.inkMuted, fontSize: 10 },
  seenIcon: { marginLeft: 2 },

  typingRow: { paddingHorizontal: spacing.xxl, paddingVertical: spacing.xs },
  olderLoader: { paddingVertical: spacing.lg, alignItems: 'center' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
  },
  attachBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  textInput: {
    flex: 1,
    minHeight: 36, maxHeight: 120,
    paddingHorizontal: spacing.md, paddingTop: 8, paddingBottom: 8,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    color: colors.inkPrimary,
    fontSize: 15,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },

  readOnlyBar: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surfaceElevated,
  },

  attachmentImage: {
    width: 220,
    height: 220,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
  },
  attachmentFile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 200,
    paddingVertical: 4,
  },
  attachmentFileIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentFileBody: { flex: 1, minWidth: 0, gap: 2 },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  sheetGrabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetTitle: { color: colors.inkPrimary },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptions: { gap: spacing.sm },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  sheetOptionPressed: { opacity: 0.7 },
  sheetOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

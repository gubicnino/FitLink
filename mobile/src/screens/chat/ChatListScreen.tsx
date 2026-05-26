import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import { ChevronRight, MessageSquare } from 'lucide-react-native';
import { colors, radii, spacing } from '../../theme';
import { Screen, Text } from '../../components/ui';
import { ScreenHeader } from '../../components/layout';
import { chatApi } from '../../api/chatApi';
import { useChatSocket } from '../../hooks/useChatSocket';
import type { ConversationResponse } from '../../types/chat';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;


export function ChatListScreen() {
  const navigation = useNavigation<Nav>();
  const currentUid = auth().currentUser?.uid ?? '';
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await chatApi.listConversations();
      setConversations(data);
    } catch (err) {
      setError(extractMessage(err));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);

  useChatSocket({
    onMessage: () => load(),
    onConversationUpdate: () => load(),
  });

  return (
    <Screen edges={['top']}>
      <ScreenHeader title="Messages" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text variant="bodyLarge" color="danger" weight="600" align="center">
            Could not load messages
          </Text>
          <Text variant="bodySmall" color="secondary" align="center" style={styles.detail}>
            {error}
          </Text>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <MessageSquare size={28} color={colors.primary} strokeWidth={2} />
          </View>
          <Text variant="h3" weight="700" align="center">
            No conversations yet
          </Text>
          <Text variant="bodySmall" color="secondary" align="center" style={styles.detail}>
            Once you connect with a trainer, you'll be able to chat here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={c => c.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={Separator}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <ConversationRow
              conversation={item}
              currentUid={currentUid}
              onPress={() => navigation.navigate('ChatThread', { conversationId: item.id })}
            />
          )}
        />
      )}
    </Screen>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

function ConversationRow({
  conversation,
  currentUid,
  onPress,
}: {
  conversation: ConversationResponse;
  currentUid: string;
  onPress: () => void;
}) {
  const peer = conversation.participants.find(p => p.userId !== currentUid)
    ?? conversation.participants[0];
  const peerName = peer?.displayName ?? 'Unknown';
  const initials = peerName.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  const last = conversation.lastMessage;
  const previewText = last?.text
    ? last.text
    : last?.hasAttachments
      ? 'Sent an attachment'
      : 'No messages yet';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.92 }]}
      accessibilityRole="button"
      accessibilityLabel={`Open chat with ${peerName}`}
    >
      <View style={styles.avatar}>
        <Text variant="bodySmall" weight="800" style={styles.avatarText}>
          {initials || '?'}
        </Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTopRow}>
          <Text variant="body" weight="700" numberOfLines={1} style={styles.rowName}>
            {peerName}
          </Text>
          {last ? (
            <Text variant="micro" color="muted">
              {formatRelative(last.sentAt)}
            </Text>
          ) : null}
        </View>
        <View style={styles.rowBottomRow}>
          <Text variant="bodySmall" color="secondary" numberOfLines={1} style={styles.rowPreview}>
            {previewText}
          </Text>
          {conversation.unreadCount > 0 ? (
            <View style={styles.unreadBadge}>
              <Text variant="micro" weight="800" style={styles.unreadBadgeText}>
                {conversation.unreadCount > 99 ? '99+' : String(conversation.unreadCount)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <ChevronRight size={16} color={colors.inkMuted} strokeWidth={2.25} />
    </Pressable>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const diffMin = Math.floor((Date.now() - then.getTime()) / 60_000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return then.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
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
  listContent: { paddingVertical: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
  },
  rowBody: { flex: 1, minWidth: 0, gap: 4 },
  rowTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  rowName: { flex: 1, letterSpacing: -0.1 },
  rowBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  rowPreview: { flex: 1 },
  unreadBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: { color: colors.white, fontSize: 11 },
  separator: { height: 1, backgroundColor: colors.line, marginLeft: spacing.xxl + 48 },

  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontSize: 15, letterSpacing: 0.3 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl, gap: spacing.md },
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xl, gap: spacing.md,
  },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  detail: { paddingHorizontal: spacing.xl },
});

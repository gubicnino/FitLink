import { MapPin, Star } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { API_ORIGIN } from '../../api/apiClient';
import { coachingApi } from '../../api/coachingApi';
import { Avatar, BadgeCheck, Button, Card, Dot, Text, Textarea } from '../../components/ui';
import { colors, spacing } from '../../theme';

export interface Trainer {
  id: string;
  firebaseUid: string;
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  priceFrom: string | null;
  bio: string;
  location: string | null;
  avatar: string | null;
}

interface TrainerListCardProps {
  trainer: Trainer;
  onPress?: () => void;
  onRequestSent?: () => void;
  requestDisabled?: boolean;
}
const getUserAvatarSource = (user: Trainer | null) => {
    if (!user?.avatar) {
      return "";
    }

    const avatarUrl = user.avatar.startsWith('http')
      ? user.avatar
      : `${API_ORIGIN}${user.avatar}`;

    return { uri: avatarUrl };
  };
export function TrainerListCard({ trainer, onPress, onRequestSent, requestDisabled = false }: TrainerListCardProps) {
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const openRequestModal = () => {
    setRequestMessage('');
    setRequestModalVisible(true);
  };

  const handleSendCoachRequest = async () => {
    const trimmedMessage = requestMessage.trim();

    if (!trimmedMessage) {
      Alert.alert('Missing message', 'Please write a message before sending the request.');
      return;
    }


    Alert.alert(
      'Health data sharing',
      `If ${trainer.name} accepts, they will be able to see your synced Health Connect data — steps, weight, heart rate, sleep, workouts, and other metrics. You can revoke access any time by ending the coaching.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'I understand, send request',
          style: 'default',
          onPress: () => sendCoachRequestNow(trimmedMessage),
        },
      ],
    );
  };

  const sendCoachRequestNow = async (trimmedMessage: string) => {
    setIsSending(true);
    try {
      await coachingApi.requestCoaching({
        trainerId: trainer.firebaseUid,
        requestMessage: trimmedMessage,
      });

      await onRequestSent?.();
      setRequestModalVisible(false);
      setRequestMessage('');
      Alert.alert('Request sent', `Your request to ${trainer.name} was sent successfully.`);
    } catch (error) {
      console.error('Sending coach request failed:', error);
      Alert.alert('Request failed', 'Could not send your coach request. Please try again.');
    } finally {
      setIsSending(false);
    }
  };
  return (
    <Card padding="md" radius="xl">
      <View style={styles.row}>
        {trainer.avatar ? (
          <Avatar source={getUserAvatarSource(trainer)} size="lg" />
        ) : (
          <></>
        )}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text variant="bodyLarge" weight="700" numberOfLines={1}>
              {trainer.name}
            </Text>
            <BadgeCheck size={15} />
          </View>
          <Text variant="bodySmall" color="secondary" style={styles.specialty}>
            {trainer.specialty}
          </Text>
          {trainer.location ? (
            <View style={styles.locationRow}>
              <MapPin size={12} color={colors.inkMuted} strokeWidth={2} />
              <Text variant="micro" color="secondary" numberOfLines={1}>
                {trainer.location}
              </Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            <View style={styles.ratingInline}>
              <Star size={12} color={colors.warning} fill={colors.warning} strokeWidth={0} />
              <Text mono tabular weight="700" variant="micro">
                {' '}
                {trainer.rating}
              </Text>
              <Text variant="micro" color="secondary">
                {' '}
                ({trainer.reviews})
              </Text>
            </View>
            <Dot />
            {trainer.priceFrom ? (
              <Text variant="micro" color="secondary">
              From{' '}
              <Text mono tabular variant="micro" weight="600">
                {trainer.priceFrom}
              </Text>
              /mo
            </Text>
            ) : null}
          </View>
        </View>
      </View>

      <Text variant="bodySmall" color="secondary" style={styles.bio}>
        {trainer.bio}
      </Text>
      <View style={{ gap: spacing.md }}>
        <Button label="View profile" variant="outline" size="md" fullWidth onPress={onPress} />

        <Button
          label={requestDisabled ? 'Request already sent' : 'Send Coach Request'}
          variant={requestDisabled ? 'secondary' : 'primary'}
          size="md"
          fullWidth
          onPress={openRequestModal}
          disabled={requestDisabled}
        />
      </View>
      <Modal visible={requestModalVisible} transparent animationType="fade" onRequestClose={() => setRequestModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setRequestModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => null}>
            <Text variant="h3" style={styles.modalTitle}>
              Message for {trainer.name}
            </Text>
            <Text variant="bodySmall" color="secondary" style={styles.modalSubtitle}>
              Write a short request message. This will be sent to the trainer.
            </Text>

            <Textarea
              label="Request message"
              value={requestMessage}
              onChangeText={setRequestMessage}
              placeholder="Hi, I would like to book a coaching session..."
              rows={5}
              containerStyle={styles.messageField}
            />

            <View style={styles.modalActions}>
              <Button
                label="Cancel"
                variant="outline"
                size="md"
                onPress={() => setRequestModalVisible(false)}
                style={styles.actionButton}
              />
              <Button
                label="Send"
                variant="primary"
                size="md"
                onPress={handleSendCoachRequest}
                loading={isSending}
                style={styles.actionButton}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.lg },
  info: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  specialty: { marginBottom: 6 },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 6,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ratingInline: { flexDirection: 'row', alignItems: 'center' },
  bio: { lineHeight: 18, marginBottom: spacing.lg },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  modalTitle: {
    marginBottom: 2,
  },
  modalSubtitle: {
    lineHeight: 18,
  },
  messageField: {
    marginTop: spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  actionButton: {
    flex: 1,
  },
});

import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Calendar, Clock, Video, X, Zap } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '../../components/ui';
import { colors, radii, spacing } from '../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onInstant: () => Promise<void>;
  onSchedule: (when: Date) => Promise<void>;
}

/**
 * Trainer-side bottom sheet for setting up a video call. 2 NACINA:
 *  - "Start now" → instant call, peer gets the join card immediately
 *  - "Schedule for later" → date + time picker → PENDING call
 */
export function CallScheduleSheet({ visible, onClose, onInstant, onSchedule }: Props) {
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<Date>(() => roundedFuture(30));
  const [iosShowingDate, setIosShowingDate] = useState(false);
  const [iosShowingTime, setIosShowingTime] = useState(false);

  const close = () => {
    if (busy) return;
    onClose();
  };

  const handleInstant = async () => {
    setBusy(true);
    try {
      await onInstant();
      onClose();
    } catch (err: any) {
      Alert.alert('Could not start call', err?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const handleSchedule = async () => {
    if (picked.getTime() < Date.now() + 2 * 60_000) {
      Alert.alert('Pick a later time', 'Scheduled calls must be at least 2 minutes in the future.');
      return;
    }
    setBusy(true);
    try {
      await onSchedule(picked);
      onClose();
    } catch (err: any) {
      Alert.alert('Could not schedule', err?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const openAndroidDate = () => {
    DateTimePickerAndroid.open({
      value: picked,
      mode: 'date',
      minimumDate: new Date(),
      onChange: (event, next) => {
        if (event.type === 'set' && next) {
          const merged = new Date(picked);
          merged.setFullYear(next.getFullYear(), next.getMonth(), next.getDate());
          setPicked(merged);
        }
      },
    });
  };

  const openAndroidTime = () => {
    DateTimePickerAndroid.open({
      value: picked,
      mode: 'time',
      is24Hour: true,
      onChange: (event, next) => {
        if (event.type === 'set' && next) {
          const merged = new Date(picked);
          merged.setHours(next.getHours(), next.getMinutes(), 0, 0);
          setPicked(merged);
        }
      },
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Video size={18} color={colors.primary} strokeWidth={2.25} />
              </View>
              <Text variant="bodyLarge" weight="700" style={{ color: colors.inkPrimary }}>
                Video call
              </Text>
            </View>
            <Pressable
              onPress={close}
              hitSlop={10}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
            >
              <X size={18} color={colors.inkSecondary} strokeWidth={2.25} />
            </Pressable>
          </View>

          {/* Start now */}
          <Pressable
            onPress={handleInstant}
            disabled={busy}
            style={({ pressed }) => [
              styles.startNow,
              pressed && !busy && { opacity: 0.88 },
              busy && { opacity: 0.55 },
            ]}
          >
            <View style={styles.startNowIcon}>
              {busy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Zap size={20} color={colors.white} strokeWidth={2.25} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body" weight="700" style={{ color: colors.white }}>
                Start now
              </Text>
              <Text variant="bodySmall" style={{ color: 'rgba(255,255,255,0.85)' }}>
                We will ping your client right away
              </Text>
            </View>
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text variant="micro" style={{ color: colors.inkMuted, letterSpacing: 0.5 }}>
              OR SCHEDULE
            </Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Date + time pickers */}
          <View style={styles.pickerRow}>
            <Pressable
              onPress={Platform.OS === 'android' ? openAndroidDate : () => setIosShowingDate(true)}
              style={({ pressed }) => [styles.pickerTile, pressed && { opacity: 0.7 }]}
            >
              <Calendar size={14} color={colors.primary} strokeWidth={2.25} />
              <Text variant="micro" weight="700" style={{ color: colors.inkSecondary, letterSpacing: 0.5 }}>
                DATE
              </Text>
              <Text variant="body" weight="700" style={{ color: colors.inkPrimary }}>
                {formatDate(picked)}
              </Text>
            </Pressable>
            <Pressable
              onPress={Platform.OS === 'android' ? openAndroidTime : () => setIosShowingTime(true)}
              style={({ pressed }) => [styles.pickerTile, pressed && { opacity: 0.7 }]}
            >
              <Clock size={14} color={colors.primary} strokeWidth={2.25} />
              <Text variant="micro" weight="700" style={{ color: colors.inkSecondary, letterSpacing: 0.5 }}>
                TIME
              </Text>
              <Text variant="body" weight="700" style={{ color: colors.inkPrimary }}>
                {formatTime(picked)}
              </Text>
            </Pressable>
          </View>

          {/* iOS spinner pickers are inline, not native modal overlays. */}
          {Platform.OS === 'ios' && iosShowingDate ? (
            <DateTimePicker
              value={picked}
              mode="date"
              display="spinner"
              minimumDate={new Date()}
              onChange={(_, next) => {
                if (next) {
                  const merged = new Date(picked);
                  merged.setFullYear(next.getFullYear(), next.getMonth(), next.getDate());
                  setPicked(merged);
                }
                setIosShowingDate(false);
              }}
            />
          ) : null}
          {Platform.OS === 'ios' && iosShowingTime ? (
            <DateTimePicker
              value={picked}
              mode="time"
              display="spinner"
              onChange={(_, next) => {
                if (next) {
                  const merged = new Date(picked);
                  merged.setHours(next.getHours(), next.getMinutes(), 0, 0);
                  setPicked(merged);
                }
                setIosShowingTime(false);
              }}
            />
          ) : null}

          <Pressable
            onPress={handleSchedule}
            disabled={busy}
            style={({ pressed }) => [
              styles.scheduleBtn,
              pressed && !busy && { opacity: 0.88 },
              busy && { opacity: 0.55 },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text variant="body" weight="700" style={{ color: colors.white }}>
                Schedule call
              </Text>
            )}
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function roundedFuture(minutesFromNow: number): Date {
  const now = new Date(Date.now() + minutesFromNow * 60_000);
  const min = now.getMinutes();
  const rounded = Math.ceil(min / 15) * 15;
  now.setMinutes(rounded, 0, 0);
  return now;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startNow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  startNowIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  pickerTile: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceElevated,
    gap: 4,
  },
  scheduleBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
});

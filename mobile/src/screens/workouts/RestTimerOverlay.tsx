import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Vibration, View } from 'react-native';
import { X } from 'lucide-react-native';
import { colors, radii, shadows, spacing } from '../../theme';
import { Button, CircularProgress, Text } from '../../components/ui';

interface Props {
  startedAt: string | null;
  durationSeconds: number;
  visible: boolean;
  onSkip: () => void;
  onChangeDuration: (next: number) => void;
}


// tudi tu uporabljamo "Date.now() - startedAt" za izracun preostalega časa, ne setInterval counter
// Ko je telefon zaklenjen in se vrne v app, takoj kaze pravo vrednost (oz pac milisekunda razlike)

export function RestTimerOverlay({
  startedAt,
  durationSeconds,
  visible,
  onSkip,
  onChangeDuration,
}: Props) {
  const [now, setNow] = useState(() => Date.now());
  const vibratedRef = useRef(false);

  // Reset vibracija lock vsakeč ko se overlay reodpre
  useEffect(() => {
    if (visible) vibratedRef.current = false;
  }, [visible, startedAt]);

  useEffect(() => {
    if (!visible || !startedAt) return undefined;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [visible, startedAt]);

  if (!visible || !startedAt) return null;

  const startMs = new Date(startedAt).getTime();
  const elapsed = Math.max(0, (now - startMs) / 1000);
  const remaining = Math.max(0, Math.ceil(durationSeconds - elapsed));
  const progress = durationSeconds > 0 ? Math.min(1, elapsed / durationSeconds) : 1;

  // Vibracija ko timer resta pride na 0
  if (remaining === 0 && !vibratedRef.current) {
    vibratedRef.current = true;
    Vibration.vibrate([0, 200, 100, 200]);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSkip}>
      <View style={styles.scrim}>
        <View style={[styles.card, shadows.modal]}>
          <View style={styles.cardHeader}>
            <Text variant="caption" color="muted">
              Rest
            </Text>
            <Pressable
              onPress={onSkip}
              hitSlop={8}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.5 }]}
              accessibilityLabel="Skip rest"
            >
              <X size={16} color={colors.inkPrimary} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={styles.timerWrap}>
            <CircularProgress
              size={180}
              strokeWidth={10}
              value={1 - progress}
              fillColor={remaining === 0 ? colors.success : colors.primary}
              trackColor={colors.surfaceElevated}
            />
            <View style={styles.timerCenter} pointerEvents="none">
              <Text mono tabular weight="700" style={styles.timerText}>
                {formatRest(remaining)}
              </Text>
              <Text variant="micro" color="muted" style={styles.timerSub}>
                {remaining === 0 ? 'Done!' : 'remaining'}
              </Text>
            </View>
          </View>

          <View style={styles.adjustRow}>
            <Button
              label="−15s"
              variant="secondary"
              size="md"
              onPress={() => onChangeDuration(Math.max(0, durationSeconds - 15))}
              style={styles.adjustBtn}
            />
            <Button
              label="+15s"
              variant="secondary"
              size="md"
              onPress={() => onChangeDuration(durationSeconds + 15)}
              style={styles.adjustBtn}
            />
          </View>

          <Button label="Skip rest" variant="primary" fullWidth onPress={onSkip} />
        </View>
      </View>
    </Modal>
  );
}

function formatRest(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    gap: spacing.xl,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  timerWrap: { alignItems: 'center', justifyContent: 'center' },
  timerCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  timerText: { fontSize: 36, lineHeight: 40, letterSpacing: -1 },
  timerSub: { marginTop: 4 },

  adjustRow: { flexDirection: 'row', gap: spacing.md },
  adjustBtn: { flex: 1 },
});

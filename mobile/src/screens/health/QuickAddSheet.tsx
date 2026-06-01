import { Droplet, Footprints, HeartPulse, Scale, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Text } from '../../components/ui';
import { colors, radii, spacing } from '../../theme';

type MetricKind = 'weight' | 'steps' | 'water' | 'heart';

interface Props {
  visible: boolean;
  onClose: () => void;
  onWeight: (kg: number) => Promise<void>;
  onSteps: (count: number) => Promise<void>;
  onWater: (ml: number) => Promise<void>;
  onHeartRate: (bpm: number) => Promise<void>;
}

interface KindConfig {
  label: string;
  unit: string;
  icon: React.ReactNode;
  keyboard: 'numeric' | 'decimal-pad';
  placeholder: string;
  min: number;
  max: number;
}

const CONFIG: Record<MetricKind, KindConfig> = {
  weight: {
    label: 'Weight',
    unit: 'kg',
    icon: <Scale size={20} color={colors.primary} strokeWidth={2.25} />,
    keyboard: 'decimal-pad',
    placeholder: '75.4',
    min: 20,
    max: 400,
  },
  steps: {
    label: 'Steps',
    unit: 'count',
    icon: <Footprints size={20} color={colors.primary} strokeWidth={2.25} />,
    keyboard: 'numeric',
    placeholder: '3500',
    min: 1,
    max: 100000,
  },
  water: {
    label: 'Water',
    unit: 'ml',
    icon: <Droplet size={20} color={colors.primary} strokeWidth={2.25} />,
    keyboard: 'numeric',
    placeholder: '250',
    min: 10,
    max: 5000,
  },
  heart: {
    label: 'Heart rate',
    unit: 'bpm',
    icon: <HeartPulse size={20} color={colors.primary} strokeWidth={2.25} />,
    keyboard: 'numeric',
    placeholder: '72',
    min: 20,
    max: 220,
  },
};


export function QuickAddSheet({
  visible,
  onClose,
  onWeight,
  onSteps,
  onWater,
  onHeartRate,
}: Props) {
  const [kind, setKind] = useState<MetricKind | null>(null);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setKind(null);
    setValue('');
    setSaving(false);
  };

  const close = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const submit = async () => {
    if (!kind) return;
    const cfg = CONFIG[kind];
    const n = Number(value.replace(',', '.'));
    if (!Number.isFinite(n) || n < cfg.min || n > cfg.max) {
      Alert.alert('Invalid value', `Enter a number between ${cfg.min} and ${cfg.max} ${cfg.unit}.`);
      return;
    }
    setSaving(true);
    try {
      if (kind === 'weight') await onWeight(n);
      else if (kind === 'steps') await onSteps(n);
      else if (kind === 'water') await onWater(n);
      else if (kind === 'heart') await onHeartRate(n);
      reset();
      onClose();
    } catch (err: any) {
      Alert.alert('Could not save', err?.message ?? 'Unknown error');
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <Text variant="bodyLarge" weight="700" style={{ color: colors.inkPrimary }}>
              {kind ? `Log ${CONFIG[kind].label.toLowerCase()}` : 'Quick add'}
            </Text>
            <Pressable
              onPress={close}
              hitSlop={10}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
            >
              <X size={18} color={colors.inkSecondary} strokeWidth={2.25} />
            </Pressable>
          </View>

          {!kind ? (
            <View style={styles.options}>
              {(['weight', 'steps', 'water', 'heart'] as MetricKind[]).map(k => (
                <Pressable
                  key={k}
                  onPress={() => setKind(k)}
                  style={({ pressed }) => [styles.option, pressed && { opacity: 0.7 }]}
                >
                  <View style={styles.optionIcon}>{CONFIG[k].icon}</View>
                  <View style={{ flex: 1 }}>
                    <Text variant="body" weight="700" style={{ color: colors.inkPrimary }}>
                      {CONFIG[k].label}
                    </Text>
                    <Text variant="bodySmall" style={{ color: colors.inkSecondary }}>
                      Add in {CONFIG[k].unit}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.entry}>
              <View style={styles.entryHeader}>
                <View style={styles.entryIcon}>{CONFIG[kind].icon}</View>
                <Text variant="bodyLarge" weight="700" style={{ color: colors.inkPrimary }}>
                  {CONFIG[kind].label}
                </Text>
              </View>
              <TextInput
                value={value}
                onChangeText={setValue}
                placeholder={CONFIG[kind].placeholder}
                placeholderTextColor={colors.inkMuted}
                keyboardType={CONFIG[kind].keyboard}
                autoFocus
                style={styles.input}
              />
              <Text variant="micro" style={{ color: colors.inkMuted, marginTop: 4 }}>
                {CONFIG[kind].unit}
              </Text>

              <View style={styles.actions}>
                <Pressable
                  onPress={() => {
                    setKind(null);
                    setValue('');
                  }}
                  style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text variant="body" weight="700" style={{ color: colors.primary }}>
                    Back
                  </Text>
                </Pressable>
                <Pressable
                  onPress={submit}
                  disabled={saving || !value}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && { opacity: 0.85 },
                    (saving || !value) && { opacity: 0.5 },
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text variant="body" weight="700" style={{ color: colors.white }}>
                      Save
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  card: {
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
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entry: {
    gap: 0,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  entryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.inkPrimary,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
});

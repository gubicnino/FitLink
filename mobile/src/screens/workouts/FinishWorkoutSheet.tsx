import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Check, ChevronRight, FileEdit, X } from 'lucide-react-native';
import { colors, radii, shadows, spacing } from '../../theme';
import { Button, Text } from '../../components/ui';

export type FinishMode = 'values-only' | 'save-template';

interface Props {
  visible: boolean;
  skippedExercises: string[];
  completedSets: number;
  elapsedSeconds: number;
  saving: boolean;
  onCancel: () => void;
  // POMEMBNO: mode = 'values-only' → samo session; 'save-template' → session + PUT template (z removeSkipped flag)
  onConfirm: (mode: FinishMode, removeSkipped: boolean) => void;
}


export function FinishWorkoutSheet({
  visible,
  skippedExercises,
  completedSets,
  elapsedSeconds,
  saving,
  onCancel,
  onConfirm,
}: Props) {
  // Lokalni 2 STEP flow za "Save template":
  // 1. Tap Save template → pokaze skipped exercises confirm (CE OBSTAJAJO)
  // 2. Confirm wybor → poklice onConfirm
  const [askingTemplateConfirm, setAskingTemplateConfirm] = useState(false);

  const onSaveValues = () => {
    setAskingTemplateConfirm(false);
    onConfirm('values-only', false);
  };

  const onSaveTemplate = () => {
    if (skippedExercises.length > 0) {
      setAskingTemplateConfirm(true);
    } else {
      onConfirm('save-template', false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.scrim}>
        <View style={[styles.sheet, shadows.modal]}>
          <View style={styles.handle} />

          {askingTemplateConfirm ? (
            // Stage 2:: template-update confirm
            <>
              <View style={styles.headerRow}>
                <Text variant="h3">Update template?</Text>
                <Pressable
                  onPress={() => setAskingTemplateConfirm(false)}
                  hitSlop={8}
                  style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.5 }]}
                >
                  <X size={18} color={colors.inkPrimary} strokeWidth={2} />
                </Pressable>
              </View>

              <Text variant="body" color="secondary" style={styles.body}>
                You skipped {skippedExercises.length}{' '}
                {skippedExercises.length === 1 ? 'exercise' : 'exercises'}:
              </Text>
              <View style={styles.skippedList}>
                {skippedExercises.map(name => (
                  <View key={name} style={styles.skippedItem}>
                    <View style={styles.skippedBullet} />
                    <Text variant="body" weight="500">
                      {name}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.actions}>
                <Button
                  label="Keep all"
                  variant="ghost"
                  fullWidth
                  loading={saving}
                  onPress={() => onConfirm('save-template', false)}
                />
                <Button
                  label="Remove skipped"
                  variant="primary"
                  fullWidth
                  loading={saving}
                  onPress={() => onConfirm('save-template', true)}
                />
              </View>
            </>
          ) : (
            // Stage 1: choose save mode
            <>
              <View style={styles.headerRow}>
                <View>
                  <Text variant="caption" color="muted">
                    Finish workout
                  </Text>
                  <Text variant="h3" style={styles.headerTitle}>
                    Nice work!
                  </Text>
                </View>
                <Pressable
                  onPress={onCancel}
                  hitSlop={8}
                  style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.5 }]}
                  accessibilityLabel="Cancel"
                >
                  <X size={18} color={colors.inkPrimary} strokeWidth={2} />
                </Pressable>
              </View>

              <View style={styles.statsRow}>
                <Stat label="Time" value={formatElapsed(elapsedSeconds)} />
                <Stat label="Sets" value={String(completedSets)} />
                <Stat label="Skipped" value={String(skippedExercises.length)} />
              </View>

              <Pressable
                onPress={onSaveValues}
                disabled={saving}
                style={({ pressed }) => [styles.optionRow, pressed && { opacity: 0.85 }]}
              >
                <View style={[styles.optionIcon, { backgroundColor: colors.primarySoftStrong }]}>
                  <Check size={18} color={colors.primary} strokeWidth={2.25} />
                </View>
                <View style={styles.optionText}>
                  <Text variant="body" weight="700">
                    Save values
                  </Text>
                  <Text variant="micro" color="secondary">
                    Log this session. Template stays the same.
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.inkMuted} strokeWidth={2} />
              </Pressable>

              <Pressable
                onPress={onSaveTemplate}
                disabled={saving}
                style={({ pressed }) => [styles.optionRow, pressed && { opacity: 0.85 }]}
              >
                <View style={[styles.optionIcon, { backgroundColor: colors.accentSoft }]}>
                  <FileEdit size={18} color={colors.accent} strokeWidth={2.25} />
                </View>
                <View style={styles.optionText}>
                  <Text variant="body" weight="700">
                    Save values & update template
                  </Text>
                  <Text variant="micro" color="secondary">
                    Apply today&apos;s changes (sets, weights, added exercises) back to the template.
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.inkMuted} strokeWidth={2} />
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}


function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text mono tabular weight="700" style={styles.statValue}>
        {value}
      </Text>
      <Text variant="micro" color="muted">
        {label}
      </Text>
    </View>
  );
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${h}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: { marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, lineHeight: 26 },

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1, minWidth: 0, gap: 2 },

  body: { lineHeight: 20 },
  skippedList: { gap: spacing.sm, paddingVertical: spacing.md },
  skippedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  skippedBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
});

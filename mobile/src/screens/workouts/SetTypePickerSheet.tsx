import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Check, HelpCircle, X } from 'lucide-react-native';
import { colors, radii, shadows, spacing } from '../../theme';
import { Text } from '../../components/ui';
import type { SetType } from '../../types/workout';
import { SET_TYPE_ORDER, setTypeMeta } from '../../utils/setTypeMeta';

interface Props {
  visible: boolean;
  value: SetType;
  setIndex: number;
  onSelect: (next: SetType) => void;
  onCancel: () => void;
}

// Vsaka opcija ima svoj info panel, ki se razpre pod njo (ne delimo skupnega "selectedSetType" stanja, ker lahko uporabnik odpre več info panelov hkrati).
// Vsaka opcija ima tudi svojo barvo in label (W, F, D ali številka seta za NORMAL), da se jih lažje loči in da je info bolj pregleden.

export function SetTypePickerSheet({
  visible,
  value,
  setIndex,
  onSelect,
  onCancel,
}: Props) {
  const [expandedInfo, setExpandedInfo] = useState<SetType | null>(null);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      onDismiss={() => setExpandedInfo(null)}
    >
      <View style={styles.scrim}>
        <View style={[styles.sheet, shadows.modal]}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View>
              <Text variant="caption" color="muted">
                Set {setIndex + 1}
              </Text>
              <Text variant="h3" style={styles.title}>
                Set type
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

          <View style={styles.list}>
            {SET_TYPE_ORDER.map(type => {
              const meta = setTypeMeta(type);
              const selected = value === type;
              const infoOpen = expandedInfo === type;
              return (
                <View key={type} style={styles.optionWrap}>
                  <Pressable
                    onPress={() => onSelect(type)}
                    style={({ pressed }) => [
                      styles.option,
                      selected && styles.optionSelected,
                      pressed && { opacity: 0.85 },
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <View
                      style={[
                        styles.previewBadge,
                        {
                          backgroundColor: meta.badgeBg,
                          borderColor: type === 'NORMAL' ? colors.line : meta.badgeFg,
                        },
                      ]}
                    >
                      <Text
                        mono
                        tabular
                        weight="700"
                        style={[styles.previewText, { color: meta.badgeFg }]}
                      >
                        {type === 'NORMAL' ? String(setIndex + 1) : meta.shortLabel}
                      </Text>
                    </View>

                    <Text variant="body" weight="600" style={styles.optionLabel}>
                      {meta.fullLabel}
                    </Text>

                    <Pressable
                      onPress={() => setExpandedInfo(infoOpen ? null : type)}
                      hitSlop={8}
                      style={({ pressed }) => [styles.infoBtn, pressed && { opacity: 0.5 }]}
                      accessibilityLabel={`What is ${meta.fullLabel}?`}
                    >
                      <HelpCircle
                        size={18}
                        color={infoOpen ? colors.primary : colors.inkMuted}
                        strokeWidth={2}
                      />
                    </Pressable>

                    {selected ? (
                      <View style={styles.checkWrap}>
                        <Check size={16} color={colors.primary} strokeWidth={2.5} />
                      </View>
                    ) : null}
                  </Pressable>

                  {infoOpen ? (
                    <View style={styles.infoPanel}>
                      <Text variant="bodySmall" color="secondary" style={styles.infoText}>
                        {meta.description}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
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
  title: { marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },

  list: { gap: spacing.sm },
  optionWrap: { gap: 0 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  previewBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  previewText: { fontSize: 13 },
  optionLabel: { flex: 1 },
  infoBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkWrap: { width: 20, alignItems: 'center', justifyContent: 'center' },

  infoPanel: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginTop: spacing.xs,
  },
  infoText: { lineHeight: 20 },
});

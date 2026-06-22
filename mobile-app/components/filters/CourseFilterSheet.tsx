import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ArrowDownUp, FolderTree, Layers, X } from 'lucide-react-native';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import { Button, Text } from '../ui';

export const ALL = '__all__';

export interface CourseFilterValues {
  category: string;
  contentType: string;
  sortBy: string;
}

interface Option {
  value: string;
  label: string;
}

interface Props {
  visible: boolean;
  initial: CourseFilterValues;
  categories: Option[];
  contentTypes: Option[];
  sortOptions: Option[];
  resultCount: number;
  onApply: (next: CourseFilterValues) => void;
  onClose: () => void;
}


export function CourseFilterSheet({
  visible,
  initial,
  categories,
  contentTypes,
  sortOptions,
  resultCount,
  onApply,
  onClose,
}: Props) {
  const [draft, setDraft] = useState<CourseFilterValues>(initial);


  useEffect(() => {
    if (visible) setDraft(initial);
  }, [visible, initial]);

  const reset = () => {
    setDraft({ category: ALL, contentType: ALL, sortBy: initial.sortBy});
  };

  const isDefault =
    draft.category === ALL &&
    draft.contentType === ALL &&
    draft.sortBy === initial.sortBy;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close filters">
        <Pressable
          style={[styles.sheet, shadows.modal]}
          onPress={e => e.stopPropagation()}
          accessibilityRole="none"
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <View>
              <Text variant="h3" weight="800">Filters</Text>
              <Text variant="micro" color="muted" style={styles.headerSub}>
                Narrow down what you want to learn
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.55 }]}
              accessibilityLabel="Close"
            >
              <X size={16} color={colors.inkPrimary} strokeWidth={2.25} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            <Section
              icon={<Layers size={14} color={colors.accent} strokeWidth={2.25} />}
              label="Content type"
            >
              <ChipGroup
                options={contentTypes}
                value={draft.contentType}
                onChange={v => setDraft(d => ({ ...d, contentType: v }))}
              />
            </Section>

            <Section
              icon={<FolderTree size={14} color={colors.accent} strokeWidth={2.25} />}
              label="Category"
            >
              <ChipGroup
                options={categories}
                value={draft.category}
                onChange={v => setDraft(d => ({ ...d, category: v }))}
              />
            </Section>

            <Section
              icon={<ArrowDownUp size={14} color={colors.accent} strokeWidth={2.25} />}
              label="Sort by"
            >
              <ChipGroup
                options={sortOptions}
                value={draft.sortBy}
                onChange={v => setDraft(d => ({ ...d, sortBy: v }))}
              />
            </Section>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              label="Reset"
              variant="ghost"
              size="lg"
              onPress={reset}
              style={styles.resetBtn}
              disabled={isDefault}
            />
            <Button
              label={resultCount === 1 ? 'Show 1 course' : `Show ${resultCount} courses`}
              variant="primary"
              size="lg"
              onPress={() => onApply(draft)}
              style={styles.applyBtn}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Section({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>{icon}</View>
        <Text variant="caption" weight="800" style={styles.sectionLabel}>
          {label.toUpperCase()}
        </Text>
      </View>
      {children}
    </View>
  );
}

function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: Option[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <View style={styles.chipGroup}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={({ pressed }) => [
              styles.chip,
              active && styles.chipActive,
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
          >
            <Text
              variant="bodySmall"
              weight={active ? '800' : '600'}
              style={[styles.chipLabel, active && styles.chipLabelActive]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '85%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingTop: spacing.md,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerSub: { marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },

  section: { gap: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,107,53,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.inkPrimary,
  },

  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 34,
    paddingHorizontal: spacing.lg,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chipLabel: { color: colors.inkSecondary, letterSpacing: 0.1 },
  chipLabelActive: { color: colors.primary },

  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
  },
  resetBtn: { flex: 1 },
  applyBtn: { flex: 2 },
});

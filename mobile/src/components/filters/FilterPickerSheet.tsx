import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Check, Search, X } from 'lucide-react-native';
import { colors, radii, shadows, spacing } from '../../theme';
import { Text } from '../ui';

export interface FilterOption {
  value: string;
  label: string;
}

export const ALL_VALUE = '__all__';

interface Props {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: FilterOption[];
  value: string;
  searchable?: boolean;
  onSelect: (next: string) => void;
  onCancel: () => void;
}

export function FilterPickerSheet({
  visible,
  title,
  subtitle,
  options,
  value,
  searchable,
  onSelect,
  onCancel,
}: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter(o => o.value === ALL_VALUE || o.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      onDismiss={() => setQuery('')}
    >
      <Pressable style={styles.scrim} onPress={onCancel} accessibilityLabel="Close filter">
        <Pressable
          style={[styles.sheet, shadows.modal]}
          onPress={e => e.stopPropagation()}
          accessibilityRole="none"
        >
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text variant="h3">{title}</Text>
              {subtitle ? (
                <Text variant="caption" color="muted">
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={onCancel}
              hitSlop={8}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.5 }]}
              accessibilityLabel="Close"
            >
              <X size={18} color={colors.inkPrimary} strokeWidth={2} />
            </Pressable>
          </View>

          {searchable ? (
            <View style={styles.searchWrap}>
              <Search size={16} color={colors.inkMuted} strokeWidth={2} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Filter…"
                placeholderTextColor={colors.inkMuted}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {query.length > 0 ? (
                <Pressable
                  onPress={() => setQuery('')}
                  hitSlop={8}
                  style={({ pressed }) => [styles.searchClear, pressed && { opacity: 0.5 }]}
                >
                  <X size={14} color={colors.inkMuted} strokeWidth={2} />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <FlatList
            data={filtered}
            keyExtractor={o => o.value}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={Separator}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text variant="bodySmall" color="muted" align="center">
                  No matches
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const selected = item.value === value;
              return (
                <Pressable
                  onPress={() => onSelect(item.value)}
                  style={({ pressed }) => [
                    styles.option,
                    selected && styles.optionSelected,
                    pressed && { opacity: 0.85 },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Text
                    variant="body"
                    weight={selected ? '700' : '500'}
                    style={[styles.optionLabel, selected && { color: colors.primary }]}
                  >
                    {item.label}
                  </Text>
                  {selected ? (
                    <View style={styles.optionCheck}>
                      <Check size={16} color={colors.primary} strokeWidth={2.5} />
                    </View>
                  ) : null}
                </Pressable>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '80%',
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
    marginBottom: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: { gap: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.inkPrimary,
    paddingVertical: 0,
  },
  searchClear: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xs,
  },
  optionSelected: {},
  optionLabel: { flex: 1 },
  optionCheck: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: { height: 1, backgroundColor: colors.line, opacity: 0.5 },

  empty: { paddingVertical: spacing.xxl },
});

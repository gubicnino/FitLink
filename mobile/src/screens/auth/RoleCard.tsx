import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors, radii, spacing } from '../../theme';
import { Text } from '../../components/ui';

interface RoleCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}

export function RoleCard({ icon, title, description, selected, onPress }: RoleCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected ? styles.selected : styles.unselected,
        pressed && { opacity: 0.95 },
      ]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      {selected ? (
        <View style={styles.checkBadge}>
          <Check size={12} color={colors.white} strokeWidth={3} />
        </View>
      ) : null}
      <View style={[styles.iconWrap, selected ? styles.iconSelected : styles.iconIdle]}>
        {icon}
      </View>
      <Text variant="bodySmall" weight="600" style={styles.title}>
        {title}
      </Text>
      <Text variant="micro" color="secondary" style={styles.desc}>
        {description}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radii.lg,
    padding: spacing.xl,
    position: 'relative',
  },
  selected: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  unselected: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  iconSelected: { backgroundColor: 'rgba(46,91,159,0.10)' },
  iconIdle: { backgroundColor: colors.surfaceElevated },
  title: { marginBottom: spacing.xs },
  desc: { lineHeight: 14 },
  checkBadge: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

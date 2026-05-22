import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight, Dumbbell, Hash, Timer } from 'lucide-react-native';
import { colors, radii, spacing } from '../../theme';
import { Text } from '../../components/ui';

export interface WorkoutTemplate {
  id: string;
  name: string;
  exerciseCount: number;
  setCount?: number;
  durationMinutes?: number;
  lastUsed?: string;
  tag?: string;
}

interface WorkoutTemplateCardProps {
  template: WorkoutTemplate;
  onPress?: () => void;
}

export function WorkoutTemplateCard({ template, onPress }: WorkoutTemplateCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Open template ${template.name}`}
    >
      <View style={styles.accent} />

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.titleWrap}>
            <Text variant="bodyLarge" weight="700" numberOfLines={1} style={styles.title}>
              {template.name}
            </Text>
            {template.lastUsed ? (
              <Text variant="micro" color="muted">
                Last used {template.lastUsed}
              </Text>
            ) : null}
          </View>
          <View style={styles.chevronWrap}>
            <ChevronRight size={16} color={colors.inkMuted} strokeWidth={2.25} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <Stat
            icon={<Dumbbell size={12} color={colors.inkSecondary} strokeWidth={2.25} />}
            value={template.exerciseCount}
            label={template.exerciseCount === 1 ? 'exercise' : 'exercises'}
          />
          {template.setCount != null ? (
            <>
              <View style={styles.divider} />
              <Stat
                icon={<Hash size={12} color={colors.inkSecondary} strokeWidth={2.25} />}
                value={template.setCount}
                label={template.setCount === 1 ? 'set' : 'sets'}
              />
            </>
          ) : null}
          {template.durationMinutes != null ? (
            <>
              <View style={styles.divider} />
              <Stat
                icon={<Timer size={12} color={colors.inkSecondary} strokeWidth={2.25} />}
                value={`~${template.durationMinutes}`}
                label="min"
              />
            </>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      {icon}
      <Text mono tabular weight="700" style={styles.statValue}>
        {value}
      </Text>
      <Text variant="micro" color="muted" style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.997 }] },
  accent: { width: 3, backgroundColor: colors.primary },

  body: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingLeft: spacing.xl,
    paddingRight: spacing.lg,
    gap: spacing.md,
  },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  titleWrap: { flex: 1, minWidth: 0, gap: 2 },
  title: { letterSpacing: -0.2 },
  chevronWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { fontSize: 14, lineHeight: 16, color: colors.inkPrimary },
  statLabel: { letterSpacing: 0.2 },
  divider: { width: 1, height: 12, backgroundColor: colors.line },
});

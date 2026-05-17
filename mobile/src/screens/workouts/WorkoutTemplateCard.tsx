import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ChevronRight, Clock, Dumbbell } from 'lucide-react-native';
import { colors, radii, spacing } from '../../theme';
import { Card, Dot, Text } from '../../components/ui';

export interface WorkoutTemplate {
  id: string;
  name: string;
  exerciseCount: number;
  durationMinutes?: number;
  lastUsed?: string;
  tag?: string;
}

interface WorkoutTemplateCardProps {
  template: WorkoutTemplate;
  onPress?: () => void;
}

export function WorkoutTemplateCard({ template, onPress }: WorkoutTemplateCardProps) {
  const metaItems: React.ReactNode[] = [
    <Text key="count" variant="bodySmall" color="secondary">
      {template.exerciseCount} {template.exerciseCount === 1 ? 'exercise' : 'exercises'}
    </Text>,
  ];
  if (template.durationMinutes != null) {
    metaItems.push(
      <View key="dur" style={styles.metaInline}>
        <Clock size={11} color={colors.inkSecondary} strokeWidth={2} />
        <Text variant="bodySmall" color="secondary">
          {' '}
          ~{template.durationMinutes} min
        </Text>
      </View>,
    );
  }
  if (template.lastUsed) {
    metaItems.push(
      <Text key="last" variant="bodySmall" color="secondary">
        {template.lastUsed}
      </Text>,
    );
  }

  return (
    <Card padding="md" onPress={onPress}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Dumbbell size={20} color={colors.primary} strokeWidth={2} />
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text variant="bodyLarge" weight="600">
              {template.name}
            </Text>
            {template.tag ? (
              <Text variant="caption" color="muted">
                {template.tag}
              </Text>
            ) : null}
          </View>
          <View style={styles.metaRow}>
            {metaItems.map((node, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 ? <Dot /> : null}
                {node}
              </React.Fragment>
            ))}
          </View>
        </View>
        <ChevronRight size={18} color={colors.inkMuted} strokeWidth={2} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  metaInline: { flexDirection: 'row', alignItems: 'center' },
});

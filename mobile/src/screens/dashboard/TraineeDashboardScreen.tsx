import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight, Flame, Play } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { coachingApi } from '../../api/coachingApi';
import { NotificationBell, ScreenHeader } from '../../components/layout';
import {
    Avatar,
    Button,
    Card,
    Screen,
    Sparkline,
    StatCard,
    Tag,
    Text
} from '../../components/ui';
import CoachingCard from '../../components/ui/CoachingCard';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing } from '../../theme';
import { Coaching } from '../../types/coaching';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const HERO_IMG =
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80&auto=format';

const ME_IMG =
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&q=80&auto=format';

export function TraineeDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const [coachings, setCoachings] = useState<Coaching[] | []>([]);
  const [activeCoaching, setActiveCoaching] = useState<Coaching | null>(null);
  useEffect(() => {
    const fetchCoachings = async () => {
      try {
        const coachings = await coachingApi.getMyCoachings();
        setCoachings(coachings);
        for (const coaching of coachings) {
          if (coaching.status === 'ACTIVE') {
            setActiveCoaching(coaching);
            break;
          }
        }
      } catch (error) {
        console.error('Error fetching coachings:', error);
      }
    };
    fetchCoachings();
  }, []);
  return (
    <Screen scroll edges={['top']}>
      <ScreenHeader
        eyebrow="Thursday, May 14"
        title="Good morning, Janez"
        right={
          <View style={styles.headerRight}>
            <NotificationBell hasUnread />
            <Avatar source={ME_IMG} size="lg" />
          </View>
        }
      />

      <View style={[styles.row, styles.gutter]}>
        <StatCard
          label="Steps"
          value="8,421"
          footer={<Sparkline data={[18, 15, 17, 11, 12, 7, 9, 4]} />}
        />
        <StatCard
          label="Streak"
          value="12"
          unit="days"
          footer={
            <View style={styles.streakRow}>
              <Flame size={14} color={colors.accent} fill={colors.accent} strokeWidth={2} />
              <Text variant="micro" color="secondary">
                Personal best
              </Text>
            </View>
          }
        />
        <StatCard
          label="This week"
          value="3"
          unit="/ 4"
          footer={
            <Text variant="micro" color="secondary">
              workouts
            </Text>
          }
        />
      </View>

      <View style={[styles.gutter, styles.section]}>
        <Card padding="none" style={styles.heroCard}>
          <View style={styles.heroImageWrap}>
            <Image source={{ uri: HERO_IMG }} style={styles.heroImage} />
            <View style={styles.heroOverlay} />
            <View style={styles.heroTagWrap}>
              <Tag label="Today" tone="overlay" uppercase />
            </View>
            <View style={styles.heroText}>
              <Text variant="h3" color="inverse" style={{ lineHeight: 22 }}>
                Push Day
              </Text>
              <Text variant="bodySmall" color="inverse" style={{ opacity: 0.85 }}>
                5 exercises • 45 min
              </Text>
            </View>
          </View>
          <View style={styles.heroBody}>
            <Text variant="bodySmall" color="secondary" style={styles.heroExercises}>
              Bench Press, Shoulder Press, Tricep Extension, Lateral Raise, Incline Dumbbell Press
            </Text>
            <Button
              label="Start workout"
              variant="accent"
              fullWidth
              leftIcon={<Play size={16} color={colors.white} fill={colors.white} strokeWidth={0} />}
              onPress={() => navigation.navigate('LiveWorkout')}
            />
          </View>
        </Card>
      </View>
      {activeCoaching ?  (
          <View style={[styles.gutter, styles.section]}>
            <Text variant="caption" color="muted" style={styles.sectionLabel}>
              Your Coach
            </Text>
            <CoachingCard coaching={activeCoaching} />
          </View>
      ) : (
          <View style={[styles.gutter, styles.section]}>
            <Button
                  label="Find your coach"
                  variant="primary"
                  fullWidth
                  onPress={() => navigation.navigate('FindTrainer')}
                />
          </View>
      )
    }
      
      

      <View style={[styles.gutter, styles.section]}>
        <Text variant="caption" color="muted" style={styles.sectionLabel}>
          Check-ins
        </Text>
        <Card padding="none">
          <Pressable
            style={({ pressed }) => [styles.listRow, pressed && { opacity: 0.85 }]}
            onPress={() => navigation.navigate('WeeklyCheckIn')}
          >
            <View style={styles.flex}>
              <Text variant="body" weight="600">
                Weekly check-in
              </Text>
              <Text variant="bodySmall" color="secondary">
                Due in 2 days
              </Text>
            </View>
            <Tag label="Pending" tone="warning" />
          </Pressable>
          <View style={styles.separator} />
          <Pressable
            style={({ pressed }) => [styles.listRow, pressed && { opacity: 0.85 }]}
            onPress={() => navigation.navigate('WeeklyCheckIn')}
          >
            <View style={styles.flex}>
              <Text variant="body" weight="600">
                Last week&apos;s progress
              </Text>
              <Text variant="bodySmall" color="secondary">
                May 6 — May 12
              </Text>
            </View>
            <ChevronRight size={18} color={colors.inkMuted} strokeWidth={2} />
          </Pressable>
        </Card>
      </View>

      <View style={styles.bottomSpacer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.md },
  gutter: { paddingHorizontal: spacing.xxl },
  section: { marginTop: spacing.xl },
  sectionLabel: { marginBottom: spacing.md },
  bottomSpacer: { height: spacing.huge },

  heroCard: { overflow: 'hidden' },
  heroImageWrap: { height: 120, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  heroTagWrap: { position: 'absolute', top: spacing.lg, left: spacing.lg },
  heroText: { position: 'absolute', bottom: spacing.lg, left: spacing.xl, right: spacing.xl },
  heroBody: { padding: spacing.xl, gap: spacing.lg },
  heroExercises: { lineHeight: 18 },

  coachRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  coachInfo: { flex: 1, minWidth: 0 },
  coachNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  coachAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },

  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  flex: { flex: 1 },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _r: { borderRadius: radii.lg },
});

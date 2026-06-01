import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Flame, Play } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { API_ORIGIN } from '../../api/apiClient';
import { coachingApi } from '../../api/coachingApi';
import { NotificationBell, ScreenHeader } from '../../components/layout';
import {
    Avatar,
    Button,
    Card,
    CheckInList,
    Screen,
    Sparkline,
    StatCard,
    Tag,
    Text
} from '../../components/ui';
import CoachingCard from '../../components/ui/CoachingCard';
import { HealthHomeCards } from '../../components/health/HealthHomeCards';
import { HealthStatsGrid } from '../../components/health/HealthStatsGrid';
import type { RootStackParamList } from '../../navigation/types';
import { authService } from '../../services/authService';
import { colors, radii, spacing } from '../../theme';
import { Coaching } from '../../types/coaching';
import { User } from '../../types/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const HERO_IMG =
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80&auto=format';

 const getUserAvatarSource = (user: User | null) => {
    if (!user?.avatarUrl) {
      return "";
    }

    const avatarUrl = user.avatarUrl.startsWith('http')
      ? user.avatarUrl
      : `${API_ORIGIN}${user.avatarUrl}`;

    return { uri: avatarUrl };
  };
export function TraineeDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const [coachings, setCoachings] = useState<Coaching[] | []>([]);
  const [activeCoaching, setActiveCoaching] = useState<Coaching | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const fetchCoachings = useCallback(async () => {
    try {
      const coachings = await coachingApi.getMyCoachings();
      setCoachings(coachings);
      const currentActiveCoaching = coachings.find((coaching) => coaching.status === 'ACTIVE') ?? null;
      setActiveCoaching(currentActiveCoaching);
    } catch (error) {
      console.error('Error fetching coachings:', error);
      setActiveCoaching(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCoachings();
    }, [fetchCoachings]),
  );

  useEffect(() => {
    fetchCoachings();

    const fetchUser = async () => {
      const user = await authService.getUser();
      setUser(user);
    }

    fetchUser();
  }, [fetchCoachings]);
  return (
    <Screen scroll edges={['top']}>
      <ScreenHeader
        eyebrow="Thursday, May 14"
        title={`Welcome back, ${user?.displayName || 'Trainee'}!`}
        right={
          <View style={styles.headerRight}>
            <NotificationBell hasUnread />
            <Avatar source={getUserAvatarSource(user)} size="lg" />
          </View>
        }
      />

      <View style={styles.gutter}>
        <HealthStatsGrid />
      </View>

      <View style={[styles.gutter, styles.section]}>
        <HealthHomeCards
          onViewAll={() => navigation.navigate('Health')}
          onConnect={() => navigation.navigate('Health')}
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
      
      
      {activeCoaching ? (<CheckInList checkIns={activeCoaching?.checkIns} />) : (
        <View style={[styles.gutter, styles.section]}>
          <Text variant="caption" color="muted" style={styles.sectionLabel}>
            No active coaching find a coach to start your fitness journey!
          </Text>
        </View>
      )}
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _r: { borderRadius: radii.lg },
});

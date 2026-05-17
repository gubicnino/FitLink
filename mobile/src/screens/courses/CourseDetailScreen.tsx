import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import {
  Bookmark,
  Check,
  ChevronLeft,
  Play,
  Share2,
  Star,
} from 'lucide-react-native';
import { colors, radii, shadows, spacing } from '../../theme';
import {
  Avatar,
  BadgeCheck,
  Button,
  IconButton,
  Screen,
  Text,
} from '../../components/ui';
import { ReviewCard, Review } from './ReviewCard';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const HERO_IMG =
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80&auto=format';
const COACH_IMG =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80&auto=format';

const REVIEWS: Review[] = [
  {
    id: '1',
    name: 'Janez Novak',
    stars: 5,
    comment: 'Clear, no fluff. The set/rep breakdown finally made PPL click for me.',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&q=80&auto=format',
  },
  {
    id: '2',
    name: 'Ana Vidmar',
    stars: 5,
    comment: 'Maja explains progression really well. Following the program for 6 weeks now.',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&q=80&auto=format',
  },
  {
    id: '3',
    name: 'Tomaž Horvat',
    stars: 4,
    comment: 'Solid fundamentals. Wish there was more on deload weeks.',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80&auto=format',
  },
];

const TABS = ['Overview', 'Reviews'] as const;
type DetailTab = (typeof TABS)[number];

export function CourseDetailScreen() {
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<DetailTab>('Overview');

  return (
    <Screen background="surface" scroll edges={['top']}>
      <View style={styles.gutter}>
        <View style={styles.videoWrap}>
          <Image source={{ uri: HERO_IMG }} style={styles.videoImage} />
          <View style={styles.videoOverlay} />
          <View style={[styles.playButton, shadows.modal]}>
            <Play size={26} color={colors.inkPrimary} fill={colors.inkPrimary} strokeWidth={0} />
          </View>
          <View style={styles.videoControls}>
            <IconButton variant="overlay" onPress={() => navigation.goBack()}>
              <ChevronLeft size={18} color={colors.white} strokeWidth={2.25} />
            </IconButton>
            <View style={styles.controlsRight}>
              <IconButton variant="overlay">
                <Bookmark size={16} color={colors.white} strokeWidth={2} />
              </IconButton>
              <IconButton variant="overlay">
                <Share2 size={16} color={colors.white} strokeWidth={2} />
              </IconButton>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.gutter, styles.section]}>
        <Text variant="h3" style={styles.title}>
          Complete Push Pull Legs Guide
        </Text>

        <View style={styles.authorRow}>
          <Avatar source={COACH_IMG} size="lg" />
          <View style={styles.authorInfo}>
            <View style={styles.authorName}>
              <Text variant="bodySmall" weight="600">
                Coach Maja Kovač
              </Text>
              <BadgeCheck size={14} />
            </View>
            <Text variant="micro" color="secondary">
              Strength & Conditioning
            </Text>
          </View>
          <Button label="Follow" variant="outline" size="sm" />
        </View>

        <View style={styles.stats}>
          <StatItem icon={<Star size={13} color={colors.warning} fill={colors.warning} strokeWidth={0} />} value="4.8" label="Rating" />
          <StatItem value="1.2k" label="Views" />
          <StatItem value="12" unit="min" label="Duration" />
        </View>

        <View style={styles.tabs}>
          {TABS.map(t => {
            const active = t === tab;
            return (
              <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, active && styles.tabActive]}>
                <Text variant="bodySmall" color={active ? 'primary' : 'muted'} weight="600">
                  {t}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'Overview' ? (
          <>
            <Text variant="bodySmall" color="secondary" style={styles.description}>
              A comprehensive walkthrough of the Push Pull Legs split — exercise selection, volume,
              intensity, and how to progress from week to week. Built for intermediate lifters
              ready to structure their training.
            </Text>

            <Button
              label="Mark as complete"
              variant="primary"
              fullWidth
              leftIcon={<Check size={16} color={colors.white} strokeWidth={2.5} />}
              style={styles.cta}
            />

            <View style={styles.reviewsHeader}>
              <Text variant="caption" color="muted">
                Reviews
              </Text>
              <Text variant="bodySmall" color="brand" weight="600">
                See all
              </Text>
            </View>
            <View style={styles.reviews}>
              {REVIEWS.map(r => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </View>
          </>
        ) : (
          <View style={styles.reviews}>
            {REVIEWS.map(r => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.bottomSpacer} />
    </Screen>
  );
}

function StatItem({
  icon,
  value,
  unit,
  label,
}: {
  icon?: React.ReactNode;
  value: string;
  unit?: string;
  label: string;
}) {
  return (
    <View style={styles.statItem}>
      <View style={styles.statValueRow}>
        {icon}
        <Text mono tabular weight="700" style={styles.statValue}>
          {value}
        </Text>
        {unit ? (
          <Text variant="micro" color="secondary" style={styles.statUnit}>
            {unit}
          </Text>
        ) : null}
      </View>
      <Text variant="caption" color="muted">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: spacing.xxl },
  section: { marginTop: spacing.lg },

  videoWrap: {
    aspectRatio: 16 / 9,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.black,
    position: 'relative',
  },
  videoImage: { width: '100%', height: '100%', opacity: 0.9 },
  videoOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.3)' },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 64,
    height: 64,
    marginLeft: -32,
    marginTop: -32,
    borderRadius: 32,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoControls: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  controlsRight: { flexDirection: 'row', gap: spacing.md },

  title: { fontSize: 20, lineHeight: 24, marginBottom: spacing.lg },

  authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.xl },
  authorInfo: { flex: 1 },
  authorName: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  stats: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingBottom: spacing.xxl,
    marginBottom: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  statItem: { flex: 1 },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  statValue: { fontSize: 15 },
  statUnit: { marginLeft: 2 },

  tabs: {
    flexDirection: 'row',
    gap: spacing.xxl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    marginBottom: spacing.lg,
  },
  tab: { paddingBottom: spacing.md, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },

  description: { lineHeight: 18, marginBottom: spacing.xxl },
  cta: { marginBottom: spacing.xxl },

  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  reviews: { gap: spacing.md },

  bottomSpacer: { height: spacing.huge },
});

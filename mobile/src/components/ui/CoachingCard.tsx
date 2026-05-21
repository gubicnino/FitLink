import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
    Avatar,
    BadgeCheck,
    Card,
    Text
} from '../../components/ui';
import type { RootStackParamList } from '../../navigation/types';
import { authService } from '../../services/authService';
import { colors, spacing } from '../../theme';
import { Coaching } from '../../types/coaching';
import { User } from '../../types/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const COACH_IMG =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&q=80&auto=format';


interface CoachingCardProps {
    coaching: Coaching;
}
const CoachingCard = ({ coaching }: CoachingCardProps) => {
    const navigation = useNavigation<Nav>();
    const [trainer, setTrainer] = useState<User | null>(null);
    useEffect(() => {
        const fetchTrainer = async () => {
            const fetchedTrainer = await authService.getUser();
            setTrainer(fetchedTrainer!);
        };
        fetchTrainer();
    }, [coaching]);
    return (
        <>
            <Card padding="md" onPress={() => navigation.navigate('FindTrainer')}>
            <View style={styles.coachRow}>
                <Avatar source={COACH_IMG} size="xl" />
                <View style={styles.coachInfo}>
                <View style={styles.coachNameRow}>
                    <Text variant="body" weight="600" numberOfLines={1}>
                    {trainer?.displayName ?? 'Your Coach'}
                    </Text>
                    <BadgeCheck size={15} />
                </View>
                <View style={styles.statusRow}>
                    <View style={styles.statusDot} />
                    <Text variant="bodySmall" color="secondary">
                    New message
                    </Text>
                </View>
                </View>
                <View style={styles.coachAction}>
                <Text variant="bodySmall" color="brand" weight="600">
                    Coaching
                </Text>
                <ChevronRight size={16} color={colors.primary} strokeWidth={2.25} />
                </View>
            </View>
            </Card>
        </ >
    )
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  gutter: { paddingHorizontal: spacing.xxl },
  section: { marginTop: spacing.xl },

  coachRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  coachInfo: { flex: 1, minWidth: 0 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  coachAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  coachNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
});


export default CoachingCard
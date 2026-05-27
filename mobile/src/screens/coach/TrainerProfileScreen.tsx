import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronLeft, Mail } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { userApi } from '../../api/userApi';
import { ScreenHeader } from '../../components/layout';
import { Avatar, BadgeCheck, Card, IconButton, Screen, Text } from '../../components/ui';
import type { RootStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import type { User } from '../../types/types';
import { getAvatarUrl } from '../../utils/avatar';

type Props = NativeStackScreenProps<RootStackParamList, 'TrainerProfile'>;

export function TrainerProfileScreen({ navigation, route }: Props) {
  const [trainer, setTrainer] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTrainer = async () => {
      const trainerId = route.params?.trainerId;
      if (!trainerId) {
        setError('Trainer profile could not be loaded.');
        return;
      }

      try {
        const nextTrainer = await userApi.getUserByFirebaseUid(trainerId);
        setTrainer(nextTrainer);
      } catch (firebaseError) {
        try {
          const nextTrainer = await userApi.getUserById(trainerId);
          setTrainer(nextTrainer);
        } catch (idError) {
          console.error('Trainer profile load failed:', idError);
          setError('Trainer profile could not be loaded.');
        }
      }
    };

    loadTrainer();
  }, [route.params?.trainerId]);

  const specializations = trainer?.trainer?.specializations?.filter(Boolean) ?? [];

  return (
    <Screen scroll edges={['top']} background="surface">
      <ScreenHeader
        title="Coach profile"
        left={
          <IconButton variant="surface" withBorder onPress={() => navigation.goBack()}>
            <ChevronLeft size={18} color={colors.inkPrimary} strokeWidth={2.25} />
          </IconButton>
        }
      />

      <View style={styles.content}>
        {error ? (
          <Card padding="md">
            <Text variant="bodySmall" color="secondary">
              {error}
            </Text>
          </Card>
        ) : (
          <>
            <Card padding="lg">
              <View style={styles.headerRow}>
                <Avatar source={getAvatarUrl(trainer?.avatarUrl)} size="xxl" />
                <View style={styles.headerInfo}>
                  <View style={styles.nameRow}>
                    <Text variant="h3">{trainer?.displayName ?? 'Coach'}</Text>
                    {trainer?.trainer?.verificationStatus === 'APPROVED' ? <BadgeCheck size={16} /> : null}
                  </View>
                  <View style={styles.emailRow}>
                    <Mail size={13} color={colors.inkSecondary} strokeWidth={2} />
                    <Text variant="bodySmall" color="secondary" numberOfLines={1}>
                      {trainer?.email ?? 'No email available'}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>

            <Card padding="md">
              <Text variant="caption" color="muted" style={styles.sectionLabel}>
                Bio
              </Text>
              <Text variant="bodySmall" color="secondary" style={styles.bodyText}>
                {trainer?.trainer?.bio || 'This coach has not added a bio yet.'}
              </Text>
            </Card>

            <Card padding="md">
              <Text variant="caption" color="muted" style={styles.sectionLabel}>
                Specializations
              </Text>
              <View style={styles.specializations}>
                {specializations.length > 0 ? (
                  specializations.map(item => (
                    <View key={item} style={styles.specializationPill}>
                      <Text variant="caption" color="brand" weight="600">
                        {item}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text variant="bodySmall" color="secondary">
                    No specializations listed.
                  </Text>
                )}
              </View>
            </Card>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  headerInfo: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionLabel: { marginBottom: spacing.sm },
  bodyText: { lineHeight: 18 },
  specializations: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  specializationPill: {
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});

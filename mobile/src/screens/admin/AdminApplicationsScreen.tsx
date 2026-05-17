import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Linking, StyleSheet, View } from 'react-native';
import apiClient from '../../api/apiClient';
import { ScreenHeader } from '../../components/layout';
import { Button, Card, Screen, Text } from '../../components/ui';
import type { RootStackParamList } from '../../navigation/types';
import { spacing } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminApplications'>;

interface TrainerApplication {
  id: string;
  displayName: string;
  email: string;
  bio: string;
  specializations: string[];
  certificateFileName: string;
  certificateFileUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
}

export function AdminApplicationsScreen({ navigation }: Props) {
  const [applications, setApplications] = useState<TrainerApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/trainer-applications/pending');
      setApplications(response.data);
    } catch (error) {
      console.error('Failed to load applications:', error);
      Alert.alert('Error', 'Failed to load trainer applications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleDownloadCertificate = async (fileName: string) => {
    try {
      // Build the certificate download URL using the API base URL
      const certificateUrl = `http://10.0.2.2:8080/api/trainer-applications/certificate/${fileName}`;
      
      // Try to open the PDF in default viewer or browser
      const canOpen = await Linking.canOpenURL(certificateUrl);
      if (canOpen) {
        await Linking.openURL(certificateUrl);
      } else {
        // If direct link fails, show alert with manual instructions
        Alert.alert(
          'Download Certificate',
          `Certificate: ${fileName}\n\nThe file will be downloaded if you proceed.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Download', onPress: async () => {
              try {
                // Attempt download via API
                const response = await apiClient.get(`/trainer-applications/certificate/${fileName}`, {
                  responseType: 'arraybuffer',
                  timeout: 30000,
                });
                Alert.alert('Success', 'Certificate downloaded successfully');
              } catch (downloadError) {
                console.error('Download error:', downloadError);
                Alert.alert('Error', 'Could not download the certificate');
              }
            }},
          ],
        );
      }
    } catch (error) {
      console.error('Certificate open error:', error);
      Alert.alert('Error', 'Failed to process certificate request');
    }
  };

  const handleApprove = async (applicationId: string) => {
    setProcessingId(applicationId);
    try {
      await apiClient.post(`/trainer-applications/${applicationId}/approve`);
      Alert.alert('Success', 'Application approved');
      loadApplications();
    } catch (error) {
      console.error('Approve failed:', error);
      Alert.alert('Error', 'Failed to approve application');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (applicationId: string) => {
    Alert.prompt(
      'Decline Application',
      'Provide a rejection reason:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          onPress: async (rejectionReason:any) => {
            if (!rejectionReason?.trim()) {
              Alert.alert('Error', 'Rejection reason is required');
              return;
            }

            setProcessingId(applicationId);
            try {
              await apiClient.post(`/trainer-applications/${applicationId}/reject`, {
                rejectionReason: rejectionReason.trim(),
              });
              Alert.alert('Success', 'Application rejected');
              loadApplications();
            } catch (error) {
              console.error('Reject failed:', error);
              Alert.alert('Error', 'Failed to reject application');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
      'plain-text',
    );
  };

  const renderApplicationCard = ({ item }: { item: TrainerApplication }) => (
    <Card padding="lg" style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="h3">{item.displayName}</Text>
          <Text variant="bodySmall" color="secondary">
            {item.email}
          </Text>
          <Text variant="caption" color="secondary" style={styles.date}>
            Submitted: {new Date(item.submittedAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.statusBadge}>
          <Text variant="caption" weight="600">
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <Text variant="bodySmall" weight="600" style={styles.sectionTitle}>
        Bio
      </Text>
      <Text variant="bodySmall" style={styles.bio}>
        {item.bio}
      </Text>

      <Text variant="bodySmall" weight="600" style={styles.sectionTitle}>
        Specializations
      </Text>
      <View style={styles.tags}>
        {item.specializations.map((spec) => (
          <View key={spec} style={styles.tag}>
            <Text variant="caption">{spec}</Text>
          </View>
        ))}
      </View>

      <Text variant="bodySmall" weight="600" style={styles.sectionTitle}>
        Certificate
      </Text>
      <Text variant="bodySmall" color="secondary" style={styles.fileName}>
        {item.certificateFileName}
      </Text>

      <View style={styles.actions}>
        <Button
          label="Download"
          variant="outline"
          onPress={() => handleDownloadCertificate(item.certificateFileName)}
          fullWidth
        />
        <Button
          label="Approve"
          onPress={() => handleApprove(item.id)}
          loading={processingId === item.id}
          fullWidth
        />
        <Button
          label="Decline"
          variant="outline"
          onPress={() => handleDecline(item.id)}
          loading={processingId === item.id}
          fullWidth
        />
      </View>
    </Card>
  );

  return (
    <Screen edges={['top']}>
      <ScreenHeader title="Admin: Trainer Applications" />
      <View style={styles.container}>
        {applications.length === 0 ? (
          <View style={styles.empty}>
            <Text variant="bodyLarge" color="secondary" align="center">
              No pending applications
            </Text>
          </View>
        ) : (
          <FlatList
            data={applications}
            renderItem={renderApplicationCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            scrollEnabled={true}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  list: {
    gap: spacing.lg,
  },
  card: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  sectionTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  bio: {
    lineHeight: 20,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  fileName: {
    fontStyle: 'italic',
  },
  date: {
    marginTop: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AdminApplicationsScreen;

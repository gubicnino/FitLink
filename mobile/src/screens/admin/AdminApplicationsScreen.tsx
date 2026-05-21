import { Buffer } from 'buffer';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import RNFS from 'react-native-fs';
import apiClient from '../../api/apiClient';
import { ScreenHeader } from '../../components/layout';
import { Button, Card, Screen, Text } from '../../components/ui';
import { spacing } from '../../theme';


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
const getFileExtension = (fileName: string) => {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot >= 0 ? fileName.slice(lastDot) : '';
};

const getDownloadPath = (fileName: string) => {
  const targetDir =
    Platform.OS === 'android'
      ? RNFS.DownloadDirectoryPath
      : RNFS.DocumentDirectoryPath;

  return `${targetDir}/${fileName}`;
};
export function AdminApplicationsScreen() {
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

      Alert.alert(
        'Download Certificate',
        `Certificate: ${fileName}\n\nThe file will be saved to your device.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Download',
            onPress: async () => {
              try {
                const response = await apiClient.get(`/trainer-applications/certificate/${fileName}`, {
                  responseType: 'arraybuffer',
                  timeout: 30000,
                });

                const base64 = Buffer.from(response.data, 'binary').toString('base64');
                const downloadPath = getDownloadPath(fileName);

                await RNFS.writeFile(downloadPath, base64, 'base64');

                Alert.alert(
                  'Success',
                  Platform.OS === 'android'
                    ? `Certificate saved in Downloads: ${fileName}`
                    : `Certificate saved in Files: ${fileName}`,
                );
              } catch (downloadError) {
                console.error('Download error:', downloadError);
                Alert.alert('Error', 'Could not save the certificate on the phone');
              }
            },
          },
        ],
      );
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

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const openDeclineModal = (applicationId: string) => {
    setSelectedApplicationId(applicationId);
    setRejectionReason('');
    setRejectModalVisible(true);
  };

  const closeDeclineModal = () => {
    setRejectModalVisible(false);
    setSelectedApplicationId(null);
    setRejectionReason('');
  };

  const submitDecline = async () => {
    const appId = selectedApplicationId;
    if (!appId) return;
    if (!rejectionReason?.trim()) {
      Alert.alert('Error', 'Rejection reason is required');
      return;
    }

    setProcessingId(appId);
    try {
      await apiClient.post(`/trainer-applications/${appId}/reject`, {
        rejectionReason: rejectionReason.trim(),
      });
      Alert.alert('Success', 'Application rejected');
      closeDeclineModal();
      loadApplications();
    } catch (error) {
      console.error('Reject failed:', error);
      Alert.alert('Error', 'Failed to reject application');
    } finally {
      setProcessingId(null);
    }
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
          onPress={() => openDeclineModal(item.id)}
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
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDeclineModal}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalBackdrop}
          >
            <Card padding="lg" style={styles.modalCard}>
              <Text variant="h3">Decline Application</Text>
              <Text variant="bodySmall" color="secondary" style={{ marginTop: spacing.sm }}>
                Provide a rejection reason:
              </Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="Reason for rejection"
                multiline
                numberOfLines={4}
                value={rejectionReason}
                onChangeText={setRejectionReason}
                editable={processingId !== selectedApplicationId}
              />

              <View style={styles.modalActions}>
                <View style={styles.modalButton}>
                  <Button label="Cancel" variant="outline" onPress={closeDeclineModal} />
                </View>
                <View style={styles.modalButton}>
                  <Button
                    label="Decline"
                    onPress={submitDecline}
                    loading={processingId === selectedApplicationId}
                  />
                </View>
              </View>
            </Card>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
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
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 720,
    gap: spacing.md,
  },
  reasonInput: {
    minHeight: 100,
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    textAlignVertical: 'top',
    backgroundColor: '#FFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});

export default AdminApplicationsScreen;

import { errorCodes, isErrorWithCode, keepLocalCopy, pick, types } from '@react-native-documents/picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Button, Card, Screen, Text, Textarea } from '../../components/ui';
import type { RootStackParamList } from '../../navigation/types';
import { trainerApplicationService } from '../../services/trainerApplicationService';
import { spacing } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'TrainerApplication'>;

const SPECIALIZATION_OPTIONS = ['Strength', 'Weight loss', 'Mobility', 'Hypertrophy'] as const;

export function TrainerApplicationScreen({ navigation }: Props) {
  const [bio, setBio] = useState('');
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [certificateFileUrl, setCertificateFileUrl] = useState('');
  const [certificateFileName, setCertificateFileName] = useState('');
  const [certificateMimeType, setCertificateMimeType] = useState('');
  const [certificateChecksum, setCertificateChecksum] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleSpecialization = (specialization: string) => {
    setSelectedSpecializations(current =>
      current.includes(specialization)
        ? current.filter(item => item !== specialization)
        : [...current, specialization],
    );
  };

  const handlePickCertificate = async () => {
    try {
      const [picked] = await pick({
        type: types.pdf,
      });

      const [localCopy] = await keepLocalCopy({
        files: [
          {
            uri: picked.uri,
            fileName: picked.name ?? 'trainer-certificate.pdf',
          },
        ],
        destination: 'documentDirectory',
      });

      if (localCopy.status !== 'success') {
        throw new Error(localCopy.copyError);
      }

      const uploadResponse = await trainerApplicationService.uploadCertification({
        uri: localCopy.localUri,
        name: picked.name ?? 'trainer-certificate.pdf',
        type: picked.type ?? 'application/octet-stream',
      });

      setCertificateFileUrl(uploadResponse.certificateFileUrl);
      setCertificateFileName(uploadResponse.certificateFileName);
      setCertificateMimeType(uploadResponse.certificateMimeType);
      setCertificateChecksum(uploadResponse.certificateChecksum);
    } catch (error) {
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
        return;
      }

      console.error('Certificate picker failed:', error);
      Alert.alert('Picker failed', 'Could not open the file picker.');
    }
  };

  const handleSubmit = async () => {
    if (
      !bio.trim() ||
      selectedSpecializations.length === 0 ||
      !certificateFileUrl.trim() ||
      !certificateFileName.trim() ||
      !certificateMimeType.trim() ||
      !certificateChecksum.trim()
    ) {
      Alert.alert('Missing data', 'Fill in all required fields before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      await trainerApplicationService.submitApplication({
        bio: bio.trim(),
        specializations: selectedSpecializations,
        certificateFileUrl: certificateFileUrl.trim(),
        certificateFileName: certificateFileName.trim(),
        certificateMimeType: certificateMimeType.trim(),
        certificateChecksum: certificateChecksum.trim(),
      });

      Alert.alert('Application sent', 'Your trainer application is pending admin review.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Trainer application submit failed:', error);
      Alert.alert('Submission failed', 'Please check your data and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen scroll keyboardAware background="surface" contentStyle={styles.content}>
      <Text variant="display" style={styles.title}>
        Become a trainer
      </Text>
      <Text variant="bodyLarge" color="secondary" style={styles.subtitle}>
        Fill in your bio, choose your specializations, and upload your certificate for admin review.
      </Text>

      <Card padding="lg" style={styles.card}>
        <View style={styles.form}>
          <Textarea
            label="Trainer bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Tell members about your experience, focus areas, and coaching style."
            rows={5}
          />
          <View>
            <Text variant="caption" color="muted" style={styles.label}>
              Specializations
            </Text>
            <View style={styles.checkboxList}>
              {SPECIALIZATION_OPTIONS.map(option => {
                const selected = selectedSpecializations.includes(option);

                return (
                  <Pressable
                    key={option}
                    onPress={() => toggleSpecialization(option)}
                    style={({ pressed }) => [
                      styles.checkboxRow,
                      selected && styles.checkboxRowSelected,
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                      {selected ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
                    </View>
                    <Text variant="body" weight="500">
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Button label="Upload certificate" variant="outline" onPress={handlePickCertificate} />

          {certificateFileUrl ? (
            <Card padding="md" style={styles.uploadSummary}>
              <Text variant="bodySmall" weight="600">
                Selected certificate
              </Text>
              <Text variant="bodySmall" color="secondary">
                {certificateFileName}
              </Text>
              {certificateMimeType ? (
                <Text variant="caption" color="secondary">
                  {certificateMimeType}
                </Text>
              ) : null}
            </Card>
          ) : null}
        </View>
      </Card>

      <Button label="Submit application" onPress={handleSubmit} loading={isSubmitting} fullWidth />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.huge,
    flexGrow: 1,
  },
  title: { marginBottom: spacing.md },
  subtitle: { marginBottom: spacing.xl },
  card: { marginBottom: spacing.xl },
  form: { gap: spacing.lg },
  label: { marginBottom: spacing.md },
  checkboxList: { gap: spacing.md },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    backgroundColor: '#fff',
  },
  checkboxRowSelected: {
    borderColor: '#111827',
    backgroundColor: '#F9FAFB',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    borderColor: '#111827',
    backgroundColor: '#111827',
  },
  uploadSummary: { marginTop: spacing.xs },
});

export default TrainerApplicationScreen;
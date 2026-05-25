import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Camera, ChevronLeft, Lock, Trash2, TrendingDown } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Alert, Image, Modal, PermissionsAndroid, Platform, Pressable, StyleSheet, View } from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import { API_ORIGIN } from '../../api/apiClient';
import { checkInApi } from '../../api/checkInApi';
import { ScreenHeader } from '../../components/layout';
import { Button, Card, IconButton, Input, Screen, Tag, Text, Textarea } from '../../components/ui';
import type { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing } from '../../theme';
import { CheckIn, CheckInPhotoInput } from '../../types/checkin';
import { MoodOption, MoodPicker } from './MoodPicker';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface WeeklyCheckInScreenProps {
  checkIn?: CheckIn | null;
}

const MOODS: MoodOption[] = [
  { value: 1, label: 'Poor' },
  { value: 2, label: 'Below avg' },
  { value: 3, label: 'Average' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Excellent' },
];

const formatStartDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export function WeeklyCheckInScreen({ checkIn }: WeeklyCheckInScreenProps = {}) {
  const MAX_PHOTOS = 5;
  const navigation = useNavigation<Nav>();
  const isReadOnly = Boolean(checkIn);
  const [notes, setNotes] = useState<string>(checkIn?.note ?? '');
  const [overallEnergyLevel, setOverallEnergyLevel] = useState<number>(checkIn?.overallEnergyLevel ?? 3);
  const [weightKg, setWeightKg] = useState<string>(checkIn?.weightKg != null ? String(checkIn.weightKg) : '');
  const [photos, setPhotos] = useState<CheckInPhotoInput[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const savedWeight = checkIn?.weightKg != null ? String(checkIn.weightKg) : '-';

  const readOnlyPhotoUris = useMemo(() => {
    if (!checkIn) return [];
    const rawUris = checkIn.photoUrls?.length ? checkIn.photoUrls : checkIn.photoUrl ? [checkIn.photoUrl] : [];
    return rawUris.map((url) => (url.startsWith('http://') || url.startsWith('https://') ? url : `${API_ORIGIN}${url}`));
  }, [checkIn]);

  const previewUris = isReadOnly ? readOnlyPhotoUris : photos.map((item) => item.uri);

  const title = isReadOnly ? 'Check-in details' : 'Weekly Check-in';
  const eyebrow = useMemo(() => {
    if (isReadOnly) {
      return checkIn?.start ? formatStartDate(checkIn.start) : 'Saved check-in';
    }
    return 'Create a new check-in';
  }, [checkIn?.start, isReadOnly]);

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') return true;
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  const handleTakePhoto = async () => {
    if (isReadOnly) return;
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert('Limit reached', `You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }

    const granted = await requestCameraPermission();
    if (!granted) {
      Alert.alert('Permission required', 'Camera permission is required to take a check-in photo.');
      return;
    }

    const result = await launchCamera({
      mediaType: 'photo',
      cameraType: 'back',
      quality: 0.8,
      saveToPhotos: false,
      includeBase64: false,
    });

    if (result.didCancel) return;
    if (result.errorCode) {
      Alert.alert('Camera error', result.errorMessage ?? 'Could not open camera.');
      return;
    }

    const asset = result.assets?.[0];
    if (!asset?.uri) {
      Alert.alert('Camera error', 'No photo captured.');
      return;
    }

    const capturedPhoto: CheckInPhotoInput = {
      uri: asset.uri,
      name: asset.fileName ?? `checkin.${asset.type?.split('/')[1] ?? 'jpg'}`,
      type: asset.type ?? 'image/jpeg',
    };

    setPhotos((current) => {
      if (current.length >= MAX_PHOTOS) return current;
      return [...current, capturedPhoto];
    });
  };

  const handleRemovePhoto = (index: number) => {
    if (isReadOnly) return;
    setPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const openPreview = (uri: string) => {
    setPreviewImageUri(uri);
  };

  const closePreview = () => {
    setPreviewImageUri(null);
  };

  const handleSubmit = () => {
    if (isReadOnly) return;

    const parsedWeight = Number(weightKg);
    if (!weightKg.trim()) {
      Alert.alert('Validation', 'Weight is required.');
      return;
    }

    if (Number.isNaN(parsedWeight) || parsedWeight <= 0) {
      Alert.alert('Validation', 'Weight must be a valid positive number.');
      return;
    }

    if (!overallEnergyLevel || overallEnergyLevel < 1 || overallEnergyLevel > 5) {
      Alert.alert('Validation', 'Please select your overall energy level.');
      return;
    }

    const submit = async () => {
      try {
        setIsSubmitting(true);
        await checkInApi.submitCheckIn({
          weightKg: parsedWeight,
          note: notes.trim() || undefined,
          overallEnergyLevel,
          start: new Date().toISOString(),
          photos,
        });
        Alert.alert('Success', 'Check-in saved successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } catch (error) {
        console.error('Failed to submit check-in:', error);
        Alert.alert('Error', 'Could not save your check-in. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    };

    submit();
  };

  return (
    <Screen scroll keyboardAware edges={['top']}>
      <ScreenHeader
        title={title}
        eyebrow={eyebrow}
        left={
          <IconButton variant="surface" withBorder onPress={() => navigation.goBack()}>
            <ChevronLeft size={18} color={colors.inkPrimary} strokeWidth={2.25} />
          </IconButton>
        }
        right={<Tag label={isReadOnly ? 'Saved' : 'New'} tone="primary" uppercase />}
      />

      <View style={styles.gutter}>
        <Text variant="caption" color="muted" style={styles.sectionLabel}>
          Progress photos
        </Text>

        <View style={styles.photoGrid}>
          {previewUris.map((uri, index) => (
            <Pressable key={`${uri}-${index}`} style={styles.photoTile} onPress={() => openPreview(uri)}>
              <Image source={{ uri }} style={styles.photoPreview} resizeMode="cover" />
              {!isReadOnly ? (
                <Pressable style={styles.removePhotoButton} onPress={() => handleRemovePhoto(index)}>
                  <Trash2 size={12} color={colors.white} strokeWidth={2.25} />
                </Pressable>
              ) : null}
            </Pressable>
          ))}

          {!isReadOnly && photos.length < MAX_PHOTOS ? (
            <Pressable style={styles.photoCard} onPress={handleTakePhoto}>
              <View style={styles.photoIcon}>
                <Camera size={20} color={colors.inkSecondary} strokeWidth={1.75} />
              </View>
              <Text variant="bodySmall" weight="600" style={styles.photoTitle}>
                Tap to take photo
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.photoInfoRow}>
          <Text variant="bodySmall" weight="600" style={styles.photoTitle}>
            {isReadOnly
              ? previewUris.length > 0
                ? `${previewUris.length} photo${previewUris.length > 1 ? 's' : ''} saved`
                : 'No photos saved'
              : `${photos.length}/${MAX_PHOTOS} photos`}
          </Text>
          <View style={styles.photoMeta}>
            <Lock size={10} color={colors.inkSecondary} strokeWidth={2} />
            <Text variant="micro" color="secondary">
              {' '}
              Shared only with your coach
            </Text>
          </View>
        </View>

        <Text variant="caption" color="muted" style={styles.sectionLabel}>
          Body weight
        </Text>
        {isReadOnly ? (
          <Card padding="md" style={styles.section}>
            <View style={styles.weightRow}>
              <View style={styles.weightValue}>
                <Text mono tabular style={styles.weightNumber}>
                  {savedWeight}
                </Text>
                <Text variant="bodySmall" color="secondary" weight="500" style={styles.weightUnit}>
                  kg
                </Text>
              </View>
              <View style={styles.deltaBadge}>
                <TrendingDown size={13} color={colors.success} strokeWidth={2.25} />
                <Text mono tabular weight="600" style={styles.deltaText}>
                  Saved
                </Text>
              </View>
            </View>
            <Text variant="micro" color="secondary">
              Saved check-in data
            </Text>
          </Card>
        ) : (
          <Input
            label="Weight (kg)"
            value={weightKg}
            onChangeText={setWeightKg}
            keyboardType="numeric"
            placeholder=""
            containerStyle={styles.section}
          />
        )}

        <Text variant="caption" color="muted" style={styles.sectionLabel}>
          How did you feel this week?
        </Text>
        <Textarea
          value={isReadOnly ? checkIn?.note ?? '' : notes}
          onChangeText={setNotes}
          rows={3}
          containerStyle={styles.section}
          editable={!isReadOnly}
        />

        <Text variant="caption" color="muted" style={styles.sectionLabel}>
          Overall energy
        </Text>
        <View style={styles.section} pointerEvents={isReadOnly ? 'none' : 'auto'}>
          <MoodPicker options={MOODS} value={isReadOnly ? checkIn?.overallEnergyLevel ?? 3 : overallEnergyLevel} onChange={setOverallEnergyLevel} />
        </View>

        {!isReadOnly ? (
          <Button
            label={isSubmitting ? 'Submitting...' : 'Submit check-in'}
            variant="accent"
            fullWidth
            style={styles.cta}
            onPress={handleSubmit}
            disabled={isSubmitting}
          />
        ) : null}
      </View>

      <Modal visible={Boolean(previewImageUri)} transparent animationType="fade" onRequestClose={closePreview}>
        <Pressable style={styles.previewOverlay} onPress={closePreview}>
          <Pressable style={styles.previewContent} onPress={() => undefined}>
            {previewImageUri ? <Image source={{ uri: previewImageUri }} style={styles.previewImage} resizeMode="contain" /> : null}
            <Button label="Close" variant="outline" fullWidth onPress={closePreview} style={styles.previewCloseButton} />
          </Pressable>
        </Pressable>
      </Modal>

      <View style={styles.bottomSpacer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: spacing.xxl },
  sectionLabel: { marginBottom: spacing.md, marginTop: spacing.md },
  section: { marginBottom: spacing.xl },

  photoCard: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    width: '31%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  photoTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  photoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoInfoRow: { marginBottom: spacing.xl },
  photoTitle: { marginBottom: spacing.xs },
  photoMeta: { flexDirection: 'row', alignItems: 'center' },

  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  previewContent: {
    width: '100%',
    maxWidth: 520,
    alignItems: 'center',
    gap: spacing.lg,
  },
  previewImage: {
    width: '100%',
    height: 420,
    borderRadius: radii.lg,
    backgroundColor: colors.black,
  },
  previewCloseButton: {
    alignSelf: 'stretch',
  },

  weightRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  weightValue: { flexDirection: 'row', alignItems: 'baseline' },
  weightNumber: { fontSize: 32, fontWeight: '700', lineHeight: 32 },
  weightUnit: { marginLeft: 4 },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.xs,
    backgroundColor: colors.successSoft,
  },
  deltaText: { fontSize: 11, color: colors.success },

  cta: { marginTop: spacing.xl },
  bottomSpacer: { height: spacing.huge },
});

export default WeeklyCheckInScreen;

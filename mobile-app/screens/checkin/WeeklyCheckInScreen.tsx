import { useAppNavigation, useAppRoute } from '@/hooks/useAppNavigation';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
    AlertCircle,
    Camera,
    ChevronLeft,
    ClipboardCheck,
    ImagePlus,
    Lock,
    MessageSquare,
    Scale,
    Trash2,
    X,
    Zap,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    PermissionsAndroid,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { launchCamera, launchImageLibrary } from '@/utils/mediaPicker';
import { API_ORIGIN } from '@/api/apiClient';
import { checkInApi } from '@/api/checkInApi';
import { ScreenHeader } from '@/components/layout';
import { Button, IconButton, Screen, Text } from '@/components/ui';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import { CheckIn, CheckInPhotoInput } from '@/types/checkin';
import { MoodOption, MoodPicker } from './MoodPicker';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface WeeklyCheckInScreenProps {
  checkIn?: CheckIn | null;
}

const MOODS: MoodOption[] = [
  { value: 1, label: 'Drained' },
  { value: 2, label: 'Low' },
  { value: 3, label: 'Average' },
  { value: 4, label: 'Energised' },
  { value: 5, label: 'On fire' },
];

const MAX_PHOTOS = 5;

const formatStartDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export function WeeklyCheckInScreen({ checkIn }: WeeklyCheckInScreenProps = {}) {
  const navigation = useAppNavigation();
  const isReadOnly = Boolean(checkIn);

  const [notes, setNotes] = useState<string>(checkIn?.note ?? '');
  const [overallEnergyLevel, setOverallEnergyLevel] = useState<number>(
    checkIn?.overallEnergyLevel ?? 3,
  );
  const [weightKg, setWeightKg] = useState<string>(
    checkIn?.weightKg != null ? String(checkIn.weightKg) : '',
  );
  const [photos, setPhotos] = useState<CheckInPhotoInput[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const readOnlyPhotoUris = useMemo(() => {
    if (!checkIn) return [];
    const rawUris = checkIn.photoUrls?.length
      ? checkIn.photoUrls
      : checkIn.photoUrl
        ? [checkIn.photoUrl]
        : [];
    return rawUris.map((url) =>
      url.startsWith('http://') || url.startsWith('https://') ? url : `${API_ORIGIN}${url}`,
    );
  }, [checkIn]);

  const previewUris = isReadOnly ? readOnlyPhotoUris : photos.map((item) => item.uri);
  const heroDate = isReadOnly
    ? checkIn?.start
      ? formatStartDate(checkIn.start)
      : 'Saved check-in'
    : formatStartDate(new Date().toISOString());

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') return true;
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  const requestPhotoPermission = async () => {
    if (Platform.OS !== 'android') return true;
    const permission =
      Platform.Version >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    const result = await PermissionsAndroid.request(permission);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  const toPhotoInput = (asset: { uri?: string; fileName?: string | null; type?: string | null }): CheckInPhotoInput | null => {
    if (!asset.uri) return null;
    return {
      uri: asset.uri,
      name: asset.fileName ?? `checkin.${asset.type?.split('/')[1] ?? 'jpg'}`,
      type: asset.type ?? 'image/jpeg',
    };
  };

  const handleTakePhoto = async () => {
    if (isReadOnly) return;
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert('Limit reached', `You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }
    const granted = await requestCameraPermission();
    if (!granted) {
      setError('Camera permission is required to take a check-in photo.');
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
      setError(result.errorMessage ?? 'Could not open camera.');
      return;
    }
    const asset = result.assets?.[0];
    if (!asset?.uri) {
      setError('No photo captured.');
      return;
    }
    const captured = toPhotoInput(asset);
    if (!captured) {
      setError('No photo captured.');
      return;
    }
    setPhotos((current) => {
      if (current.length >= MAX_PHOTOS) return current;
      return [...current, captured];
    });
    setError(null);
  };

  const handlePickPhotos = async () => {
    if (isReadOnly) return;
    const remainingSlots = MAX_PHOTOS - photos.length;
    if (remainingSlots <= 0) {
      Alert.alert('Limit reached', `You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }
    const granted = await requestPhotoPermission();
    if (!granted) {
      setError('Photo permission is required to upload check-in photos.');
      return;
    }
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: remainingSlots,
      includeBase64: false,
      maxWidth: 1600,
      maxHeight: 1600,
      quality: 0.7,
    });
    if (result.didCancel) return;
    if (result.errorCode) {
      setError(result.errorMessage ?? 'Could not open photo library.');
      return;
    }
    const selectedPhotos = (result.assets ?? [])
      .map(toPhotoInput)
      .filter((item): item is CheckInPhotoInput => Boolean(item))
      .slice(0, remainingSlots);

    if (selectedPhotos.length === 0) {
      setError('No image was selected.');
      return;
    }

    setPhotos((current) => [...current, ...selectedPhotos].slice(0, MAX_PHOTOS));
    setError(null);
  };

  const handleRemovePhoto = (index: number) => {
    if (isReadOnly) return;
    setPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSubmit = () => {
    if (isReadOnly) return;
    const parsedWeight = Number(weightKg);
    if (!weightKg.trim()) {
      setError('Weight is required.');
      return;
    }
    if (Number.isNaN(parsedWeight) || parsedWeight <= 0 || parsedWeight > 500) {
      setError('Weight must be a valid number (1–500 kg).');
      return;
    }
    if (!overallEnergyLevel || overallEnergyLevel < 1 || overallEnergyLevel > 5) {
      setError('Please pick your energy level.');
      return;
    }
    setError(null);
    (async () => {
      try {
        setIsSubmitting(true);
        await checkInApi.submitCheckIn({
          weightKg: parsedWeight,
          note: notes.trim() || undefined,
          overallEnergyLevel,
          start: new Date().toISOString(),
          photos,
        });
        Alert.alert('Check-in saved', 'Your check-in has been logged.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } catch (err) {
        console.error('Failed to submit check-in:', err);
        setError('Could not save your check-in. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  const moodLabel =
    MOODS.find((m) => m.value === (isReadOnly ? checkIn?.overallEnergyLevel : overallEnergyLevel))
      ?.label ?? 'Average';

  return (
    <Screen edges={['top']} keyboardAware>
      <ScreenHeader
        title={isReadOnly ? 'Check-in' : 'New check-in'}
        left={
          <IconButton variant="surface" withBorder onPress={() => navigation.goBack()}>
            <ChevronLeft size={18} color={colors.inkPrimary} strokeWidth={2.25} />
          </IconButton>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero --------------------------------------------- */}
        <View style={styles.heroWrap}>
          <View style={[styles.hero, shadows.card]}>
            <View style={styles.heroGlow} />
            <View style={styles.heroTop}>
              <View style={styles.heroIcon}>
                <ClipboardCheck size={20} color={colors.white} strokeWidth={2.25} />
              </View>
              <View style={styles.heroStatusPill}>
                <View style={[styles.statusDot, isReadOnly ? styles.statusDotSaved : styles.statusDotNew]} />
                <Text style={styles.heroStatusText}>{isReadOnly ? 'SAVED' : 'IN PROGRESS'}</Text>
              </View>
            </View>
            <Text style={styles.heroEyebrow}>
              {isReadOnly ? 'CHECK-IN DETAILS' : 'WEEKLY CHECK-IN'}
            </Text>
            <Text style={styles.heroTitle} numberOfLines={1}>
              {isReadOnly ? 'Saved log' : 'How was this week?'}
            </Text>
            <Text style={styles.heroSub}>{heroDate}</Text>
          </View>
        </View>

        {/* Weight ------------------------------------------- */}
        <SectionHeader label="WEIGHT" />
        <View style={styles.gutter}>
          {isReadOnly ? (
            <View style={styles.statTile}>
              <View style={styles.statTileHeader}>
                <View style={styles.statTileIcon}>
                  <Scale size={14} color={colors.primary} strokeWidth={2.25} />
                </View>
                <Text variant="micro" weight="800" style={styles.statTileLabel}>
                  BODY WEIGHT
                </Text>
              </View>
              <View style={styles.statTileValueRow}>
                <Text mono tabular style={styles.statTileValue}>
                  {checkIn?.weightKg != null ? checkIn.weightKg.toFixed(1) : '—'}
                </Text>
                <Text style={styles.statTileUnit}>kg</Text>
              </View>
            </View>
          ) : (
            <WeightStepper value={weightKg} onChange={(v) => { setWeightKg(v); setError(null); }} />
          )}
        </View>

        {/* Energy ------------------------------------------- */}
        <SectionHeader label="ENERGY LEVEL" />
        <View style={styles.gutter}>
          {isReadOnly ? (
            <View style={styles.statTile}>
              <View style={styles.statTileHeader}>
                <View style={[styles.statTileIcon, { backgroundColor: 'rgba(255,107,53,0.14)' }]}>
                  <Zap size={14} color={colors.accent} strokeWidth={2.25} />
                </View>
                <Text variant="micro" weight="800" style={styles.statTileLabel}>
                  OVERALL ENERGY
                </Text>
              </View>
              <View style={styles.statTileValueRow}>
                <Text mono tabular style={styles.statTileValue}>
                  {checkIn?.overallEnergyLevel ?? '—'}
                </Text>
                <Text style={styles.statTileUnit}>/ 5</Text>
              </View>
              <Text variant="micro" color="muted" style={{ marginTop: 4 }}>
                {moodLabel}
              </Text>
            </View>
          ) : (
            <View pointerEvents={isReadOnly ? 'none' : 'auto'}>
              <MoodPicker options={MOODS} value={overallEnergyLevel} onChange={setOverallEnergyLevel} />
            </View>
          )}
        </View>

        {/* Notes -------------------------------------------- */}
        <SectionHeader label="NOTES" />
        <View style={styles.gutter}>
          {isReadOnly ? (
            <View style={styles.notesCard}>
              <View style={styles.notesIcon}>
                <MessageSquare size={14} color={colors.primary} strokeWidth={2.25} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="micro" weight="800" style={styles.statTileLabel}>
                  HOW THIS WEEK FELT
                </Text>
                <Text variant="bodySmall" style={styles.notesText}>
                  {checkIn?.note?.trim() || 'No notes left this week.'}
                </Text>
                {checkIn?.trainerComment?.text ? (
                  <View style={styles.coachReply}>
                    <Text variant="micro" weight="800" style={styles.coachReplyLabel}>
                      COACH REPLY
                    </Text>
                    <Text variant="bodySmall" style={styles.coachReplyText}>
                      {checkIn.trainerComment.text}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : (
            <View style={styles.textareaCard}>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="What worked, what didn't? Energy, sleep, nutrition…"
                placeholderTextColor={colors.inkMuted}
                multiline
                textAlignVertical="top"
                style={styles.textareaInput}
              />
              <Text variant="micro" color="muted" style={styles.textareaHint}>
                Optional — shared with your coach
              </Text>
            </View>
          )}
        </View>

        {/* Photos ------------------------------------------- */}
        <SectionHeader
          label="PROGRESS PHOTOS"
          count={isReadOnly ? previewUris.length : photos.length}
        />
        <View style={styles.gutter}>
          <View style={styles.photoMetaRow}>
            <View style={styles.photoLockRow}>
              <Lock size={11} color={colors.inkMuted} strokeWidth={2.25} />
              <Text variant="micro" color="muted">
                Visible only to you and your coach
              </Text>
            </View>
            {!isReadOnly ? (
              <Text variant="micro" weight="800" style={styles.photoCount}>
                {photos.length}/{MAX_PHOTOS}
              </Text>
            ) : null}
          </View>

          <View style={styles.photoGrid}>
            {previewUris.map((uri, index) => (
              <Pressable
                key={`${uri}-${index}`}
                style={styles.photoTile}
                onPress={() => setPreviewImageUri(uri)}
              >
                <Image source={{ uri }} style={styles.photoPreview} resizeMode="cover" />
                {!isReadOnly ? (
                  <Pressable
                    style={({ pressed }) => [styles.removePhotoBtn, pressed && { opacity: 0.7 }]}
                    onPress={() => handleRemovePhoto(index)}
                    hitSlop={6}
                    accessibilityLabel="Remove photo"
                  >
                    <Trash2 size={12} color={colors.white} strokeWidth={2.5} />
                  </Pressable>
                ) : null}
              </Pressable>
            ))}

            {!isReadOnly && photos.length < MAX_PHOTOS ? (
              <>
                <Pressable
                  style={({ pressed }) => [styles.photoAddTile, pressed && { opacity: 0.85 }]}
                  onPress={handleTakePhoto}
                  accessibilityLabel="Take photo"
                >
                  <View style={styles.photoAddIcon}>
                    <Camera size={20} color={colors.primary} strokeWidth={2.25} />
                  </View>
                  <Text variant="micro" weight="800" color="brand" style={styles.photoAddLabel}>
                    TAKE
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.photoAddTile, pressed && { opacity: 0.85 }]}
                  onPress={handlePickPhotos}
                  accessibilityLabel="Upload photo"
                >
                  <View style={styles.photoAddIcon}>
                    <ImagePlus size={20} color={colors.primary} strokeWidth={2.25} />
                  </View>
                  <Text variant="micro" weight="800" color="brand" style={styles.photoAddLabel}>
                    UPLOAD
                  </Text>
                </Pressable>
              </>
            ) : null}

            {isReadOnly && previewUris.length === 0 ? (
              <View style={styles.photoEmpty}>
                <Camera size={20} color={colors.inkMuted} strokeWidth={2} />
                <Text variant="micro" color="muted">No photos for this check-in</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Error -------------------------------------------- */}
        {error ? (
          <View style={[styles.gutter, { marginTop: spacing.md }]}>
            <View style={styles.errorBox}>
              <AlertCircle size={16} color={colors.danger} strokeWidth={2.25} />
              <Text variant="bodySmall" weight="600" color="danger" style={{ flex: 1 }}>
                {error}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Sticky CTA --------------------------------------- */}
      {!isReadOnly ? (
        <View style={[styles.ctaBar, shadows.modal]}>
          <View style={styles.ctaInfo}>
            <Text style={styles.ctaInfoLabel}>READY?</Text>
            <Text variant="bodySmall" weight="800" numberOfLines={1} style={styles.ctaInfoName}>
              {weightKg ? `${weightKg} kg · ${moodLabel}` : `Energy · ${moodLabel}`}
            </Text>
          </View>
          <Button
            label={isSubmitting ? 'Saving…' : 'Submit'}
            variant="accent"
            size="lg"
            loading={isSubmitting}
            disabled={isSubmitting}
            onPress={handleSubmit}
            leftIcon={<ClipboardCheck size={16} color={colors.white} strokeWidth={2.5} />}
            style={styles.ctaButton}
          />
        </View>
      ) : null}

      {/* Photo preview modal ------------------------------ */}
      <Modal
        visible={Boolean(previewImageUri)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageUri(null)}
      >
        <KeyboardAvoidingView style={styles.previewWrap} behavior="padding">
          <Pressable style={styles.previewBackdrop} onPress={() => setPreviewImageUri(null)} />
          <View style={styles.previewClose}>
            <IconButton variant="overlay" onPress={() => setPreviewImageUri(null)}>
              <X size={18} color={colors.white} strokeWidth={2.25} />
            </IconButton>
          </View>
          {previewImageUri ? (
            <Image
              source={{ uri: previewImageUri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : null}
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}


function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleLeft}>
        <View style={styles.sectionBar} />
        <Text variant="caption" weight="800" style={styles.sectionLabel}>
          {label}
        </Text>
      </View>
      {count != null ? (
        <View style={styles.sectionCount}>
          <Text variant="micro" weight="700" mono tabular style={styles.sectionCountText}>
            {count}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function WeightStepper({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const parsed = Number(value);
  const valid = !Number.isNaN(parsed) && parsed > 0;

  const step = (delta: number) => {
    const next = (valid ? parsed : 70) + delta;
    const clamped = Math.max(0, Math.min(500, next));
    onChange(clamped.toFixed(1).replace(/\.0$/, ''));
  };

  return (
    <View style={styles.weightCard}>
      <View style={styles.weightHeader}>
        <View style={styles.statTileIcon}>
          <Scale size={14} color={colors.primary} strokeWidth={2.25} />
        </View>
        <Text variant="micro" weight="800" style={styles.statTileLabel}>
          BODY WEIGHT
        </Text>
      </View>
      <View style={styles.weightRow}>
        <Pressable
          onPress={() => step(-0.5)}
          style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.7 }]}
          hitSlop={8}
          accessibilityLabel="Decrease weight"
        >
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <View style={styles.weightInputWrap}>
          <TextInput
            value={value}
            onChangeText={onChange}
            keyboardType="decimal-pad"
            placeholder="0.0"
            placeholderTextColor={colors.inkMuted}
            style={styles.weightInput}
            maxLength={6}
          />
          <Text style={styles.weightUnit}>kg</Text>
        </View>
        <Pressable
          onPress={() => step(0.5)}
          style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.7 }]}
          hitSlop={8}
          accessibilityLabel="Increase weight"
        >
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.huge + 80, paddingTop: spacing.xs },
  gutter: { paddingHorizontal: spacing.xxl },
  bottomSpacer: { height: spacing.xl },

  // Hero
  heroWrap: { paddingHorizontal: spacing.xxl, paddingTop: spacing.md },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: -90,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.primaryDark,
    opacity: 0.5,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDotNew: { backgroundColor: colors.accent },
  statusDotSaved: { backgroundColor: colors.success },
  heroStatusText: { color: colors.white, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.4,
    fontSize: 10,
    fontWeight: '800',
  },
  heroTitle: {
    color: colors.white,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.5,
    fontWeight: '800',
    marginTop: 2,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
  },
  sectionTitleLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionBar: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.inkPrimary,
  },
  sectionCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceElevated,
  },
  sectionCountText: { color: colors.inkSecondary, fontSize: 10 },

  // Stat tile (read-only result)
  statTile: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    gap: 4,
  },
  statTileHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statTileIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTileLabel: { fontSize: 10, letterSpacing: 0.8, color: colors.inkSecondary },
  statTileValueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 2 },
  statTileValue: {
    fontSize: 36,
    lineHeight: 38,
    letterSpacing: -1,
    fontWeight: '800',
    color: colors.inkPrimary,
  },
  statTileUnit: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '700',
    color: colors.inkSecondary,
  },

  // Weight stepper card
  weightCard: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  weightHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontSize: 24, fontWeight: '800', color: colors.inkPrimary, lineHeight: 26 },
  weightInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 6,
  },
  weightInput: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
    color: colors.inkPrimary,
    fontVariant: ['tabular-nums'],
    minWidth: 90,
    textAlign: 'right',
    paddingVertical: 0,
  },
  weightUnit: { fontSize: 14, fontWeight: '700', color: colors.inkSecondary },

  // Textarea card
  textareaCard: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  textareaInput: {
    minHeight: 96,
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkPrimary,
    fontWeight: '500',
    padding: 0,
  },
  textareaHint: { letterSpacing: 0.2 },

  // Read-only notes
  notesCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  notesIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesText: { color: colors.inkPrimary, lineHeight: 20, marginTop: 6 },

  coachReply: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.22)',
  },
  coachReplyLabel: { color: colors.accent, fontSize: 10, letterSpacing: 0.8 },
  coachReplyText: { marginTop: 4, lineHeight: 19, color: colors.inkPrimary },

  // Photos
  photoMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  photoLockRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  photoCount: { color: colors.inkSecondary, fontSize: 11, letterSpacing: 0.4 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  photoTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
  },
  photoPreview: { width: '100%', height: '100%' },
  removePhotoBtn: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAddTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  photoAddIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoftStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAddLabel: { letterSpacing: 0.8 },
  photoEmpty: {
    width: '100%',
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },

  // Sticky CTA
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  ctaInfo: { flex: 1, minWidth: 0, gap: 2 },
  ctaInfoLabel: {
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: '800',
    color: colors.inkMuted,
  },
  ctaInfoName: { letterSpacing: -0.1 },
  ctaButton: { minWidth: 130 },

  // Preview modal
  previewWrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  previewClose: {
    position: 'absolute',
    top: spacing.xxl,
    right: spacing.xxl,
    zIndex: 10,
  },
  previewImage: {
    width: '92%',
    height: '70%',
    borderRadius: radii.lg,
  },
});

export default WeeklyCheckInScreen;

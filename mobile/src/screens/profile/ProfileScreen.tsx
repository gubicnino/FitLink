import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { CommonActions, NavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  BadgeCheck,
  Calculator,
  Calendar,
  Camera,
  Check,
  ChevronRight,
  Clock,
  GraduationCap,
  ImagePlus,
  LogOut,
  Mail,
  Pencil,
  Ruler,
  Trash2,
  User as UserIcon,
  Weight,
  X,
} from 'lucide-react-native';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { launchImageLibrary } from 'react-native-image-picker';
import apiClient, { API_ORIGIN } from '../../api/apiClient';
import { ScreenHeader } from '../../components/layout';
import { Button, IconButton, Screen, Text } from '../../components/ui';
import { RootStackParamList } from '../../navigation';
import { authService } from '../../services/authService';
import { colors, radii, shadows, spacing } from '../../theme';
import { User } from '../../types/types';
import { DEFAULT_AVATAR, getAvatarUrl } from '../../utils/avatar';

type Nav = NavigationProp<RootStackParamList>;

const HERO_AVATAR_SIZE = 96;

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);

  // Profile detail form state (held locally; saved through edit sheets)
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [currentWeightKg, setCurrentWeightKg] = useState('');

  // Inline display-name editing
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);
  const displayNameInputRef = useRef<TextInput>(null);

  // Edit modal control: Kere field je v stanje editanja
  const [editField, setEditField] = useState<EditField | null>(null);
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);
  const [showIosBirthPicker, setShowIosBirthPicker] = useState(false);

  const loadUser = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await authService.getUser();
      setBirthDate(currentUser?.profile?.birthDate ?? '');
      setGender(currentUser?.profile?.gender ?? '');
      setHeightCm(currentUser?.profile?.heightCm?.toString() ?? '');
      setCurrentWeightKg(currentUser?.profile?.currentWeightKg?.toString() ?? '');
      setDisplayName(currentUser?.displayName ?? '');
      setUser(currentUser);
    } catch (err) {
      console.error('Failed to load user in ProfileScreen:', err);
      setError('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useFocusEffect(useCallback(() => { loadUser(); }, [loadUser]));

  const saveDisplayName = useCallback(async () => {
    const next = displayName.trim();
    const current = user?.displayName?.trim() ?? '';
    setIsEditingDisplayName(false);
    if (!next || next === current) {
      setDisplayName(current);
      return;
    }
    try {
      setIsSavingDisplayName(true);
      setError(null);
      await apiClient.post('/profile/update', { displayName: next });
      setUser(curr => curr ? { ...curr, displayName: next } : curr);
      setDisplayName(next);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update display name.';
      setError(msg);
      setDisplayName(current);
    } finally {
      setIsSavingDisplayName(false);
    }
  }, [displayName, user?.displayName]);

  const getAvatarSource = () => {
    if (!user?.avatarUrl) return DEFAULT_AVATAR;
    const avatarUrl = getAvatarUrl(user.avatarUrl);
    return avatarUrl.startsWith('data:') ? avatarUrl : `${avatarUrl}?v=${avatarVersion}`;
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

  const handleAvatarUpload = async () => {
    if (isAvatarUploading) return;
    try {
      setError(null);
      const hasPermission = await requestPhotoPermission();
      if (!hasPermission) {
        setError('Photo permission is required to change avatar.');
        return;
      }
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        includeBase64: false,
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.7,
      });
      if (result.didCancel) return;
      if (result.errorCode) {
        setError(result.errorMessage ?? 'Could not open photo library.');
        return;
      }
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        setError('No image was selected.');
        return;
      }
      setIsAvatarUploading(true);
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName ?? `avatar.${asset.type?.split('/')[1] ?? 'jpg'}`,
        type: asset.type ?? 'image/jpeg',
      } as any);
      const token = await authService.getToken();
      const response = await fetch(`${API_ORIGIN}/api/profile/avatar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Avatar upload failed with status ${response.status}`);
      }
      setAvatarVersion(Date.now());
      await loadUser();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to upload profile photo.';
      setError(msg);
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const handleAvatarDelete = async () => {
    if (!user?.avatarUrl || isAvatarUploading) return;
    try {
      setIsAvatarUploading(true);
      setError(null);
      await apiClient.delete('/profile/avatar');
      setUser(curr => curr ? { ...curr, avatarUrl: null } : curr);
      setAvatarVersion(Date.now());
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to remove profile photo.';
      setError(msg);
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const handleAvatarPress = () => {
    if (!user?.avatarUrl) {
      handleAvatarUpload();
      return;
    }
    setAvatarSheetOpen(true);
  };

  const handleLogout = async () => {
    Alert.alert('Sign out?', 'You will need to sign in again to use the app.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await authService.logout();
          navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Auth' }] }));
        },
      },
    ]);
  };

  const handleBirthDatePress = () => {
    if (Platform.OS === 'android') {
      const current = birthDate ? parseBirthDate(birthDate) : new Date();
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        is24Hour: true,
        onChange: async (_event, selectedDate) => {
          if (!selectedDate) return;
          const next = formatSelectedDate(selectedDate);
          setBirthDate(next);
          await saveProfileField('birthDate', next);
        },
      });
      return;
    }
    setShowIosBirthPicker(true);
  };

  const saveProfileField = useCallback(
    async (field: 'birthDate' | 'gender' | 'heightCm' | 'currentWeightKg', value: string) => {
      setError(null);
      const payload: Record<string, string | number> = {};
      if (field === 'birthDate') payload.birthDate = value;
      else if (field === 'gender') payload.gender = value;
      else if (field === 'heightCm') {
        const h = parseFloat(value);
        if (isNaN(h) || h <= 0 || h > 300) {
          setError('Height must be between 1 and 300 cm.');
          return false;
        }
        payload.heightCm = h;
      } else if (field === 'currentWeightKg') {
        const w = parseFloat(value);
        if (isNaN(w) || w <= 0 || w > 500) {
          setError('Weight must be between 1 and 500 kg.');
          return false;
        }
        payload.currentWeightKg = w;
      }
      try {
        await apiClient.post('/profile/update', payload);
        await loadUser();
        return true;
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Failed to save.';
        setError(msg);
        return false;
      }
    },
    [loadUser],
  );

  const stats = useMemo(() => buildStats(user, heightCm, currentWeightKg, birthDate), [user, heightCm, currentWeightKg, birthDate]);
  const isTrainer = user?.role === 'TRAINER';
  const trainerStatus = user?.trainer?.verificationStatus ?? null;
  const showVerificationCard =
    isTrainer && (trainerStatus === 'PENDING' || trainerStatus === 'REJECTED');

  if (loading) {
    return (
      <Screen edges={['top']}>
        <ScreenHeader title="Profile" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <ScreenHeader title="Profile" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero ------------------------------------------------------- */}
        <View style={styles.heroWrap}>
          <View style={[styles.hero, shadows.card]}>
            <View style={styles.heroGlow} />
            <View style={styles.heroGlowBottom} />

            <View style={styles.avatarWrap}>
              <Pressable onPress={handleAvatarPress} disabled={isAvatarUploading}>
                <View style={styles.avatarRing}>
                  <Image source={typeof getAvatarSource() === 'string' ? { uri: getAvatarSource() as string } : (getAvatarSource() as any)} style={styles.avatar} />
                </View>
                <View style={styles.cameraBadge}>
                  {isAvatarUploading ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Camera size={14} color={colors.white} strokeWidth={2.25} />
                  )}
                </View>
              </Pressable>
            </View>

            {/* Display name */}
            {isEditingDisplayName ? (
              <View style={styles.nameEditorRow}>
                <TextInput
                  ref={displayNameInputRef}
                  value={displayName}
                  onChangeText={setDisplayName}
                  onBlur={saveDisplayName}
                  onSubmitEditing={saveDisplayName}
                  autoFocus
                  style={styles.nameInput}
                  placeholder="Your name"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  editable={!isSavingDisplayName}
                  returnKeyType="done"
                />
                <Pressable
                  onPress={saveDisplayName}
                  disabled={isSavingDisplayName}
                  style={styles.nameSaveBtn}
                >
                  <Check size={16} color={colors.primary} strokeWidth={3} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  setDisplayName(user?.displayName ?? '');
                  setIsEditingDisplayName(true);
                  requestAnimationFrame(() => displayNameInputRef.current?.focus());
                }}
                style={styles.namePressable}
                hitSlop={6}
              >
                <Text style={styles.nameText} numberOfLines={1}>
                  {user?.displayName || 'Tap to set name'}
                </Text>
                <Pencil size={14} color="rgba(255,255,255,0.55)" strokeWidth={2} />
              </Pressable>
            )}

            {/* Email */}
            <View style={styles.emailRow}>
              <Mail size={12} color="rgba(255,255,255,0.55)" strokeWidth={2.25} />
              <Text style={styles.emailText} numberOfLines={1}>
                {user?.email}
              </Text>
            </View>

            {/* Role badge */}
            <View style={styles.roleRow}>
              <RoleBadge role={user?.role ?? 'TRAINEE'} status={trainerStatus} />
            </View>

            {/* Hero stats */}
            <View style={styles.heroStatsRow}>
              {stats.map((s, idx) => (
                <React.Fragment key={s.label}>
                  {idx > 0 ? <View style={styles.heroStatDivider} /> : null}
                  <HeroStat value={s.value} unit={s.unit} label={s.label} />
                </React.Fragment>
              ))}
            </View>
          </View>
        </View>

        {/* Trainer verification card -------------------------------- */}
        {showVerificationCard ? (
          <View style={styles.gutter}>
            <View style={[styles.verificationCard, trainerStatus === 'REJECTED' && styles.verificationCardRejected]}>
              <View style={styles.verificationHeader}>
                <View style={[styles.verificationIcon, trainerStatus === 'REJECTED' && styles.verificationIconRejected]}>
                  {trainerStatus === 'PENDING' ? (
                    <Clock size={16} color={colors.warning} strokeWidth={2.25} />
                  ) : (
                    <X size={16} color={colors.danger} strokeWidth={2.25} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="body" weight="800" style={styles.verificationTitle}>
                    {trainerStatus === 'PENDING' ? 'Application under review' : 'Application not approved'}
                  </Text>
                  <Text variant="micro" color="secondary" style={styles.verificationSub}>
                    {trainerStatus === 'PENDING'
                      ? "We're reviewing your trainer application. You'll be notified once it's decided."
                      : user?.trainer?.rejectionReason || 'Please review and re-submit your application.'}
                  </Text>
                </View>
              </View>
              {trainerStatus === 'REJECTED' ? (
                <Button
                  label="Re-apply"
                  variant="outline"
                  size="md"
                  onPress={() => navigation.navigate('TrainerApplication')}
                  style={{ marginTop: spacing.md }}
                />
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Quick actions -------------------------------------------- */}
        {!isTrainer ? (
          <View style={styles.gutter}>
            <View style={styles.quickRow}>
              <QuickAction
                icon={<Calculator size={18} color={colors.primary} strokeWidth={2.25} />}
                label="Calorie calculator"
                hint="BMR & macros"
                onPress={() => navigation.navigate('CalorieCalculator')}
              />
              <QuickAction
                icon={<GraduationCap size={18} color={colors.accent} strokeWidth={2.25} />}
                label={trainerStatus === 'PENDING' ? 'Application pending' : 'Become a trainer'}
                hint={trainerStatus === 'PENDING' ? 'Awaiting review' : 'Coach trainees, build courses'}
                onPress={() => navigation.navigate('TrainerApplication')}
                disabled={trainerStatus === 'PENDING'}
                accent
              />
            </View>
          </View>
        ) : (
          <View style={styles.gutter}>
            <View style={styles.quickRow}>
              <QuickAction
                icon={<GraduationCap size={18} color={colors.accent} strokeWidth={2.25} />}
                label="Add a course"
                hint="Publish content"
                onPress={() => navigation.navigate('AddCourses')}
                accent
              />
              <QuickAction
                icon={<Calculator size={18} color={colors.primary} strokeWidth={2.25} />}
                label="Calorie calculator"
                hint="For yourself or clients"
                onPress={() => navigation.navigate('CalorieCalculator')}
              />
            </View>
          </View>
        )}

        {/* Body / Personal section --------------------------------- */}
        <SectionHeader label="PERSONAL" />
        <View style={styles.gutter}>
          <View style={styles.statTileRow}>
            <EditableStatTile
              icon={<Ruler size={14} color={colors.primary} strokeWidth={2.25} />}
              label="Height"
              value={heightCm}
              unit="cm"
              placeholder="—"
              onPress={() => setEditField('height')}
            />
            <EditableStatTile
              icon={<Weight size={14} color={colors.primary} strokeWidth={2.25} />}
              label="Weight"
              value={currentWeightKg}
              unit="kg"
              placeholder="—"
              onPress={() => setEditField('weight')}
            />
          </View>

          <View style={styles.listCard}>
            <ListRow
              icon={<Calendar size={16} color={colors.inkSecondary} strokeWidth={2} />}
              label="Birth date"
              value={birthDate ? formatBirthDate(birthDate) : 'Not set'}
              onPress={handleBirthDatePress}
            />
            <ListRowDivider />
            <ListRow
              icon={<UserIcon size={16} color={colors.inkSecondary} strokeWidth={2} />}
              label="Gender"
              value={gender ? capitalize(gender) : 'Not set'}
              onPress={() => setEditField('gender')}
            />
          </View>

          {/* iOS inline picker — Android uses the system dialog */}
          {Platform.OS === 'ios' && showIosBirthPicker ? (
            <View style={styles.iosPickerContainer}>
              <DateTimePicker
                value={birthDate ? parseBirthDate(birthDate) : new Date()}
                mode="date"
                display="spinner"
                onChange={async (_event, selectedDate) => {
                  if (!selectedDate) return;
                  const next = formatSelectedDate(selectedDate);
                  setBirthDate(next);
                  await saveProfileField('birthDate', next);
                }}
              />
              <Pressable
                onPress={() => setShowIosBirthPicker(false)}
                style={styles.iosPickerDone}
              >
                <Text variant="bodySmall" weight="700" color="brand">Done</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {error ? (
          <View style={styles.gutter}>
            <View style={styles.errorBox}>
              <Text variant="bodySmall" weight="600" color="danger">
                {error}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Account section ----------------------------------------- */}
        <SectionHeader label="ACCOUNT" />
        <View style={styles.gutter}>
          <View style={styles.listCard}>
            <ListRow
              icon={<LogOut size={16} color={colors.danger} strokeWidth={2.25} />}
              label="Sign out"
              value=""
              danger
              onPress={handleLogout}
            />
          </View>
        </View>
      </ScrollView>

      <EditFieldModal
        field={editField}
        currentHeight={heightCm}
        currentWeight={currentWeightKg}
        currentGender={gender}
        onClose={() => setEditField(null)}
        onSubmit={async (field, value) => {
          if (field === 'height') {
            setHeightCm(value);
            const ok = await saveProfileField('heightCm', value);
            if (ok) setEditField(null);
          } else if (field === 'weight') {
            setCurrentWeightKg(value);
            const ok = await saveProfileField('currentWeightKg', value);
            if (ok) setEditField(null);
          } else if (field === 'gender') {
            setGender(value);
            const ok = await saveProfileField('gender', value);
            if (ok) setEditField(null);
          }
        }}
      />

      <AvatarActionsSheet
        visible={avatarSheetOpen}
        onClose={() => setAvatarSheetOpen(false)}
        onChange={() => {
          setAvatarSheetOpen(false);
          handleAvatarUpload();
        }}
        onRemove={() => {
          setAvatarSheetOpen(false);
          handleAvatarDelete();
        }}
      />
    </Screen>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-components                                                              */
/* -------------------------------------------------------------------------- */

type EditField = 'height' | 'weight' | 'gender';

function RoleBadge({
  role,
  status,
}: {
  role: User['role'];
  status: User['trainer'] extends infer T ? (T extends { verificationStatus: infer S } ? S : null) : null;
}) {
  if (role === 'TRAINER') {
    if (status === 'APPROVED') {
      return (
        <View style={[styles.roleBadge, { backgroundColor: 'rgba(16,185,129,0.16)', borderColor: 'rgba(16,185,129,0.4)' }]}>
          <BadgeCheck size={12} color={colors.success} strokeWidth={2.5} />
          <Text style={[styles.roleBadgeText, { color: colors.success }]}>VERIFIED TRAINER</Text>
        </View>
      );
    }
    if (status === 'PENDING') {
      return (
        <View style={[styles.roleBadge, { backgroundColor: 'rgba(245,158,11,0.16)', borderColor: 'rgba(245,158,11,0.4)' }]}>
          <Clock size={11} color={colors.warning} strokeWidth={2.5} />
          <Text style={[styles.roleBadgeText, { color: colors.warning }]}>TRAINER · PENDING</Text>
        </View>
      );
    }
    if (status === 'REJECTED') {
      return (
        <View style={[styles.roleBadge, { backgroundColor: 'rgba(239,68,68,0.16)', borderColor: 'rgba(239,68,68,0.4)' }]}>
          <X size={11} color={colors.danger} strokeWidth={2.5} />
          <Text style={[styles.roleBadgeText, { color: colors.danger }]}>TRAINER · REJECTED</Text>
        </View>
      );
    }
    return (
      <View style={[styles.roleBadge, { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.2)' }]}>
        <Text style={[styles.roleBadgeText, { color: colors.white }]}>TRAINER</Text>
      </View>
    );
  }
  if (role === 'ADMIN') {
    return (
      <View style={[styles.roleBadge, { backgroundColor: 'rgba(255,107,53,0.18)', borderColor: 'rgba(255,107,53,0.4)' }]}>
        <Text style={[styles.roleBadgeText, { color: colors.accent }]}>ADMIN</Text>
      </View>
    );
  }
  return (
    <View style={[styles.roleBadge, { backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.22)' }]}>
      <Text style={[styles.roleBadgeText, { color: colors.white }]}>TRAINEE</Text>
    </View>
  );
}

interface HeroStatProps {
  value: string;
  unit?: string;
  label: string;
}
function HeroStat({ value, unit, label }: HeroStatProps) {
  return (
    <View style={styles.heroStat}>
      <View style={styles.heroStatValueRow}>
        <Text mono tabular style={styles.heroStatValue}>{value}</Text>
        {unit ? <Text style={styles.heroStatUnit}>{unit}</Text> : null}
      </View>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onPress: () => void;
  disabled?: boolean;
  accent?: boolean;
}
function QuickAction({ icon, label, hint, onPress, disabled, accent }: QuickActionProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.quickAction,
        accent && styles.quickActionAccent,
        disabled && { opacity: 0.55 },
        pressed && !disabled && { opacity: 0.85 },
      ]}
    >
      <View style={[styles.quickIcon, accent && styles.quickIconAccent]}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodySmall" weight="800" numberOfLines={1} style={styles.quickLabel}>
          {label}
        </Text>
        <Text variant="micro" color="muted" numberOfLines={1}>{hint}</Text>
      </View>
    </Pressable>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionBar} />
      <Text variant="caption" weight="800" style={styles.sectionLabel}>{label}</Text>
    </View>
  );
}

interface EditableStatTileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  placeholder: string;
  onPress: () => void;
}
function EditableStatTile({ icon, label, value, unit, placeholder, onPress }: EditableStatTileProps) {
  const display = value ? formatNumber(parseFloat(value)) : placeholder;
  const empty = !value;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.statTile, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.statTileHeader}>
        <View style={styles.statTileIcon}>{icon}</View>
        <Text variant="micro" color="muted" weight="700" style={styles.statTileLabel}>
          {label.toUpperCase()}
        </Text>
      </View>
      <View style={styles.statTileValueRow}>
        <Text mono tabular style={[styles.statTileValue, empty && { color: colors.inkMuted }]}>
          {display}
        </Text>
        {!empty ? <Text style={styles.statTileUnit}>{unit}</Text> : null}
      </View>
      <View style={styles.statTileEditHint}>
        <Pencil size={11} color={colors.inkMuted} strokeWidth={2} />
        <Text variant="micro" color="muted">Tap to edit</Text>
      </View>
    </Pressable>
  );
}

interface ListRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  onPress?: () => void;
  danger?: boolean;
}
function ListRow({ icon, label, value, onPress, danger }: ListRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.listRow, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.listRowIcon}>{icon}</View>
      <Text variant="body" weight="700" style={[styles.listRowLabel, danger && { color: colors.danger }]}>
        {label}
      </Text>
      {value ? (
        <Text variant="bodySmall" color="secondary" style={styles.listRowValue} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {!danger ? <ChevronRight size={16} color={colors.inkMuted} strokeWidth={2} /> : null}
    </Pressable>
  );
}

function ListRowDivider() {
  return <View style={styles.listDivider} />;
}

/* -------------------------------------------------------------------------- */
/* Edit modal                                                                  */
/* -------------------------------------------------------------------------- */

interface EditFieldModalProps {
  field: EditField | null;
  currentHeight: string;
  currentWeight: string;
  currentGender: string;
  onClose: () => void;
  onSubmit: (field: EditField, value: string) => Promise<void>;
}

function EditFieldModal({ field, currentHeight, currentWeight, currentGender, onClose, onSubmit }: EditFieldModalProps) {
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (field === 'height') setDraft(currentHeight);
    else if (field === 'weight') setDraft(currentWeight);
    else if (field === 'gender') setDraft(currentGender);
  }, [field, currentHeight, currentWeight, currentGender]);

  if (!field) return null;

  const isNumeric = field === 'height' || field === 'weight';
  const titleMap = { height: 'Edit height', weight: 'Edit weight', gender: 'Edit gender' };
  const unitMap = { height: 'cm', weight: 'kg', gender: '' };

  const submit = async () => {
    setSaving(true);
    try {
      await onSubmit(field, draft.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalScrim}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalCard, shadows.modal]}>
          <View style={styles.modalHeader}>
            <Text variant="h3" weight="800">{titleMap[field]}</Text>
            <IconButton variant="ghost" size="sm" onPress={onClose} withBorder>
              <X size={16} color={colors.inkSecondary} strokeWidth={2.25} />
            </IconButton>
          </View>

          {field === 'gender' ? (
            <View style={styles.genderChoices}>
              {(['male', 'female', 'other'] as const).map(opt => {
                const active = draft.toLowerCase() === opt;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => setDraft(opt)}
                    style={[styles.genderChip, active && styles.genderChipActive]}
                  >
                    <Text
                      variant="bodySmall"
                      weight="700"
                      style={[styles.genderChipText, active && styles.genderChipTextActive]}
                    >
                      {capitalize(opt)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.modalInputRow}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                keyboardType={isNumeric ? 'decimal-pad' : 'default'}
                autoFocus
                style={styles.modalInput}
                placeholder="0"
                placeholderTextColor={colors.inkMuted}
              />
              <Text style={styles.modalUnit}>{unitMap[field]}</Text>
            </View>
          )}

          <View style={styles.modalActions}>
            <Button label="Cancel" variant="ghost" size="lg" onPress={onClose} style={{ flex: 1 }} />
            <Button label="Save" variant="primary" size="lg" loading={saving} onPress={submit} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Avatar actions bottom sheet                                                 */
/* -------------------------------------------------------------------------- */

interface AvatarActionsSheetProps {
  visible: boolean;
  onClose: () => void;
  onChange: () => void;
  onRemove: () => void;
}

function AvatarActionsSheet({ visible, onClose, onChange, onRemove }: AvatarActionsSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.sheetScrim}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.sheetCard, shadows.modal]}>
          <View style={styles.sheetGrabber} />

          <View style={styles.sheetHeader}>
            <Text variant="h3" weight="800">Profile photo</Text>
            <Text variant="micro" color="muted" style={styles.sheetSub}>
              Choose a new image or remove the current one
            </Text>
          </View>

          <Pressable
            onPress={onChange}
            style={({ pressed }) => [styles.sheetAction, pressed && { opacity: 0.88 }]}
          >
            <View style={styles.sheetActionIcon}>
              <ImagePlus size={18} color={colors.primary} strokeWidth={2.25} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body" weight="700">Change photo</Text>
              <Text variant="micro" color="muted">Pick a new image from your gallery</Text>
            </View>
            <ChevronRight size={16} color={colors.inkMuted} strokeWidth={2} />
          </Pressable>

          <Pressable
            onPress={onRemove}
            style={({ pressed }) => [styles.sheetAction, styles.sheetActionDanger, pressed && { opacity: 0.88 }]}
          >
            <View style={[styles.sheetActionIcon, styles.sheetActionIconDanger]}>
              <Trash2 size={18} color={colors.danger} strokeWidth={2.25} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body" weight="700" color="danger">Remove photo</Text>
              <Text variant="micro" color="muted">Revert to the default avatar</Text>
            </View>
            <ChevronRight size={16} color={colors.inkMuted} strokeWidth={2} />
          </Pressable>

          <Button label="Cancel" variant="ghost" size="lg" fullWidth onPress={onClose} style={{ marginTop: spacing.sm }} />
        </View>
      </View>
    </Modal>
  );
}


interface ProfileStat {
  value: string;
  unit?: string;
  label: string;
}

function buildStats(
  user: User | null,
  heightCm: string,
  currentWeightKg: string,
  birthDate: string,
): ProfileStat[] {
  if (!user) return [];
  if (user.role === 'TRAINER') {
    const specs = user.trainer?.specializations?.length ?? 0;
    const verifiedAt = user.trainer?.verifiedAt;
    return [
      { value: String(specs), label: specs === 1 ? 'speciality' : 'specialities' },
      {
        value: verifiedAt ? formatYear(verifiedAt) : '—',
        label: verifiedAt ? 'verified' : 'not verified',
      },
      { value: heightCm || '—', unit: heightCm ? 'cm' : undefined, label: 'height' },
    ];
  }
  const age = birthDate ? calcAge(birthDate) : null;
  return [
    { value: age != null ? String(age) : '—', label: age != null ? 'years' : 'age' },
    { value: heightCm || '—', unit: heightCm ? 'cm' : undefined, label: 'height' },
    { value: currentWeightKg || '—', unit: currentWeightKg ? 'kg' : undefined, label: 'weight' },
  ];
}

function calcAge(iso: string): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

function formatYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return String(d.getFullYear());
}

function formatBirthDate(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatSelectedDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseBirthDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}


const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.huge + 40 },
  gutter: { paddingHorizontal: spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },

  // Hero card
  heroWrap: { paddingHorizontal: spacing.xxl, paddingTop: spacing.md },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
  },
  heroGlow: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.primaryDark,
    opacity: 0.5,
  },
  heroGlowBottom: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.primaryDark,
    opacity: 0.35,
  },

  avatarWrap: { position: 'relative', marginBottom: spacing.sm },
  avatarRing: {
    width: HERO_AVATAR_SIZE + 8,
    height: HERO_AVATAR_SIZE + 8,
    borderRadius: (HERO_AVATAR_SIZE + 8) / 2,
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: HERO_AVATAR_SIZE,
    height: HERO_AVATAR_SIZE,
    borderRadius: HERO_AVATAR_SIZE / 2,
    backgroundColor: colors.surfaceElevated,
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
  },

  namePressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  nameText: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.white,
    textAlign: 'center',
  },
  nameEditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '90%',
  },
  nameInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: colors.white,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radii.md,
  },
  nameSaveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  emailText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 260,
  },

  roleRow: { marginTop: 2 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  roleBadgeText: { fontSize: 10, letterSpacing: 0.8, fontWeight: '800' },

  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    paddingHorizontal: 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
    alignSelf: 'stretch',
  },
  heroStat: { flex: 1, gap: 3, alignItems: 'center' },
  heroStatValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  heroStatValue: {
    fontSize: 22,
    lineHeight: 24,
    letterSpacing: -0.6,
    fontWeight: '800',
    color: colors.white,
  },
  heroStatUnit: { marginLeft: 3, fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  heroStatLabel: {
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
  },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.14)', marginHorizontal: spacing.md },

  // Verification card
  verificationCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.warningSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  verificationCardRejected: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderColor: 'rgba(239,68,68,0.3)',
  },
  verificationHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  verificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245,158,11,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationIconRejected: { backgroundColor: 'rgba(239,68,68,0.18)' },
  verificationTitle: { letterSpacing: -0.1 },
  verificationSub: { marginTop: 2, lineHeight: 16 },

  // Quick actions
  quickRow: { flexDirection: 'row', gap: spacing.md, paddingTop: spacing.xl },
  quickAction: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.md,
  },
  quickActionAccent: {
    backgroundColor: colors.accentSoft,
    borderColor: 'rgba(255,107,53,0.25)',
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickIconAccent: { backgroundColor: 'rgba(255,107,53,0.18)' },
  quickLabel: { letterSpacing: -0.1 },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
  },
  sectionBar: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.inkPrimary,
  },

  // Stat tiles (editable)
  statTileRow: { flexDirection: 'row', gap: spacing.md },
  statTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: 6,
  },
  statTileHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statTileIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTileLabel: { fontSize: 10, letterSpacing: 0.6 },
  statTileValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  statTileValue: {
    fontSize: 28,
    lineHeight: 30,
    letterSpacing: -0.8,
    fontWeight: '800',
    color: colors.inkPrimary,
  },
  statTileUnit: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkSecondary,
  },
  statTileEditHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },

  // List card
  listCard: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  listRowIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listRowLabel: { flex: 1, letterSpacing: -0.1 },
  listRowValue: { maxWidth: '50%' },
  listDivider: { height: 1, backgroundColor: colors.line, marginLeft: spacing.lg + 28 + spacing.md },

  // iOS picker
  iosPickerContainer: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  iosPickerDone: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },

  // Error
  errorBox: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },

  // Edit modal
  modalScrim: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceElevated,
  },
  modalInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: colors.inkPrimary,
    fontVariant: ['tabular-nums'],
    padding: 0,
  },
  modalUnit: { fontSize: 16, fontWeight: '700', color: colors.inkSecondary },
  modalActions: { flexDirection: 'row', gap: spacing.md },

  // Gender chips
  genderChoices: { flexDirection: 'row', gap: spacing.sm },
  genderChip: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
  },
  genderChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  genderChipText: { color: colors.inkSecondary, letterSpacing: 0.2 },
  genderChipTextActive: { color: colors.primary },

  // Avatar actions bottom sheet
  sheetScrim: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  sheetGrabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: spacing.md,
  },
  sheetHeader: { gap: 4, marginBottom: spacing.sm },
  sheetSub: { lineHeight: 16 },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sheetActionDanger: {
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderColor: 'rgba(239,68,68,0.2)',
  },
  sheetActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetActionIconDanger: {
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
});

import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { CommonActions, NavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { Check } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, PermissionsAndroid, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import apiClient, { API_ORIGIN } from '../../api/apiClient';
import { ScreenHeader } from '../../components/layout';
import { Avatar, Button, Card, Input, Screen, Text } from '../../components/ui';
import { RootStackParamList } from '../../navigation';
import { authService } from '../../services/authService';
import { colors, spacing } from '../../theme';
import { User } from '../../types/types';
const ME_IMG =
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&q=80&auto=format';

const formatBirthDate = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatSelectedDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseBirthDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
};

export function ProfileScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [user, setUser] = useState<User | null>(null);
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [heightCm, setHeightCm] = useState<string>('');
  const [currentWeightKg, setCurrentWeightKg] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const displayNameInputRef = useRef<TextInput>(null);

  const loadUser = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await authService.getUser();
      setBirthDate(currentUser?.profile?.birthDate ?? '');
      setGender(currentUser?.profile?.gender ?? '');
      setHeightCm(currentUser?.profile?.heightCm ? currentUser.profile.heightCm.toString() : '');
      setCurrentWeightKg(currentUser?.profile?.currentWeightKg ? currentUser.profile.currentWeightKg.toString() : '');
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

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [loadUser]),
  );

  const handleAddCourse = () => {
    navigation.navigate('AddCourses');
  };

  const handleBirthDatePress = () => {
    const currentDate = birthDate ? parseBirthDate(birthDate) : new Date();

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: currentDate,
        mode: 'date',
        is24Hour: true,
        onChange: (_event, selectedDate) => {
          if (!selectedDate) return;
          setBirthDate(formatSelectedDate(selectedDate));
          setError(null);
        },
      });
      return;
    }

    setShowBirthDatePicker(true);
    setError(null);
  };

  const saveDisplayName = useCallback(async () => {
    const nextDisplayName = displayName.trim();
    const currentDisplayName = user?.displayName?.trim() ?? '';

    setIsEditingDisplayName(false);

    if (!nextDisplayName || nextDisplayName === currentDisplayName) {
      setDisplayName(currentDisplayName);
      return;
    }

    try {
      setIsSavingDisplayName(true);
      setError(null);

      await apiClient.post('/profile/update', {
        displayName: nextDisplayName,
      });

      setUser((currentUser) =>
        currentUser ? { ...currentUser, displayName: nextDisplayName } : currentUser,
      );
      setDisplayName(nextDisplayName);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to update display name.';
      setError(errorMsg);
      setDisplayName(currentDisplayName);
      console.error('Display name update error:', err);
    } finally {
      setIsSavingDisplayName(false);
    }
  }, [displayName, user?.displayName]);

  const getAvatarSource = () => {
    return user?.avatarUrl ? `${API_ORIGIN}${user.avatarUrl}?v=${avatarVersion}` : ME_IMG;
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
        quality: 0.8,
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
      const errorMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to upload profile photo.';
      setError(errorMsg);
      console.error('Avatar upload error:', err);
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      }),
    );
  };
  const handleProfileUpdate = async () => {
    setError(null);
    
    if (!birthDate.trim()) {
      setError('Birth date is required');
      return;
    }
    
    if (!gender.trim()) {
      setError('Gender is required');
      return;
    }
    
    if (!heightCm.trim()) {
      setError('Height is required');
      return;
    }
    
    if (!currentWeightKg.trim()) {
      setError('Current weight is required');
      return;
    }

    const height = parseFloat(heightCm);
    const weight = parseFloat(currentWeightKg);
    
    if (isNaN(height) || height <= 0 || height > 300) {
      setError('Height must be a valid number between 1 and 300 cm');
      return;
    }
    
    if (isNaN(weight) || weight <= 0 || weight > 500) {
      setError('Weight must be a valid number between 1 and 500 kg');
      return;
    }

    try {
      setIsLoading(true);
      const payload = {
        birthDate: birthDate.trim(),
        gender: gender.trim(),
        heightCm: height,
        currentWeightKg: weight,
      };

      const res = await apiClient.post('/profile/update', payload);
      
      if (res.status === 200) {
        setError(null);
        Alert.alert('Success', 'Profile updated successfully!', [
          {
            text: 'OK',
            onPress: async () => {
              await loadUser();
            },
          },
        ]);
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 
                       err?.message || 
                       'Failed to update profile. Please try again.';
      setError(errorMsg);
      console.error('Profile update error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  

  return (
    <Screen scroll edges={['top']}>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      ) : <>
        <ScreenHeader title="Profile" />
      <View style={styles.gutter}>
        <Card padding="lg">
          <View style={styles.row}>
            <Pressable onPress={handleAvatarUpload} disabled={isAvatarUploading}>
              <Avatar source={getAvatarSource()} size="xxl" />
            </Pressable>
            <View style={styles.info}>
              {isEditingDisplayName ? (
                <View style={styles.displayNameEditorRow}>
                  <TextInput
                    ref={displayNameInputRef}
                    value={displayName}
                    onChangeText={setDisplayName}
                    onBlur={saveDisplayName}
                    onSubmitEditing={saveDisplayName}
                    autoFocus
                    style={styles.displayNameInput}
                    placeholder="Enter display name"
                    placeholderTextColor="#9CA3AF"
                    editable={!isSavingDisplayName}
                    returnKeyType="done"
                  />
                  <Pressable
                    onPress={saveDisplayName}
                    disabled={isSavingDisplayName}
                    style={styles.displayNameSaveButton}
                    accessibilityRole="button"
                    accessibilityLabel="Save display name"
                  >
                    <Check size={18} color="#FFFFFF" strokeWidth={3} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => {
                    setDisplayName(user?.displayName ?? '');
                    setIsEditingDisplayName(true);
                    requestAnimationFrame(() => displayNameInputRef.current?.focus());
                  }}
                >
                  <Text variant="h3">{user?.displayName || 'Tap to edit name'}</Text>
                </Pressable>
              )}
              {isSavingDisplayName ? (
                <Text variant="caption" color="secondary" style={styles.status}>
                  Saving name...
                </Text>
              ) : null}
              <Text variant="bodySmall" color="secondary">
                {user?.email}
              </Text>
              <Text variant="caption" color="secondary" onPress={handleAvatarUpload}>
                {isAvatarUploading ? 'Uploading photo...' : 'Change photo'}
              </Text>
              {user?.trainer?.verificationStatus ? (
                <Text variant="caption" color="secondary" style={styles.status}>
                  Trainer status: {user.trainer.verificationStatus}
                </Text>
              ) : null}
            </View>
          </View>
        </Card>
        {user?.role !== 'TRAINER' ? (
          <Button
            label={user?.trainer?.verificationStatus === 'PENDING' ? 'Application pending' : 'Become a trainer'}
            variant="outline"
            onPress={() => navigation.navigate('TrainerApplication')}
            disabled={user?.trainer?.verificationStatus === 'PENDING'}
            fullWidth
          />
        ) : null}
        {user?.trainer?.verificationStatus === 'REJECTED' && user?.trainer?.rejectionReason ? (
          <Card padding="md">
            <Text variant="bodySmall" color="secondary">
              Last application rejected: {user.trainer.rejectionReason}
            </Text>
          </Card>
        ) : null}
        <Button
          label="Calorie calculator"
          variant="outline"
          onPress={() => navigation.navigate('CalorieCalculator')}
          fullWidth
        />
          
      </View>
      <View style={styles.formSection}>
        <Text variant="h3" style={{ marginBottom: spacing.md }}>Profile Details</Text>
        
        
        <View>
          <Text variant="caption" color="muted" style={styles.birthDateLabel}>
            Birth date
          </Text>
          <Pressable onPress={handleBirthDatePress} style={styles.birthDatePickerField}>
            <Text variant="bodySmall" color={birthDate ? 'secondary' : 'muted'}>
              {birthDate ? formatBirthDate(birthDate) : 'Select birth date'}
            </Text>
          </Pressable>
          {Platform.OS === 'ios' && showBirthDatePicker ? (
            <View style={styles.iosPickerContainer}>
              <DateTimePicker
                value={birthDate ? parseBirthDate(birthDate) : new Date()}
                mode="date"
                display="spinner"
                onChange={(_event, selectedDate) => {
                  if (!selectedDate) return;
                  setBirthDate(formatSelectedDate(selectedDate));
                  setError(null);
                }}
              />
              <Pressable
                onPress={() => setShowBirthDatePicker(false)}
                style={styles.birthDateDoneButton}
              >
                <Text variant="bodySmall" weight="600" color="secondary">
                  Done
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
        <Input 
          label="Gender" 
          value={gender} 
          onChangeText={(val) => {
            setGender(val);
            setError(null);
          }} 
          placeholder="male/female/other" 
        />
        <Input 
          label="Height (cm)" 
          value={heightCm} 
          onChangeText={(val) => {
            setHeightCm(val);
            setError(null);
          }} 
          keyboardType="numeric" 
        />
        <Input 
          label="Current weight (kg)" 
          value={currentWeightKg} 
          onChangeText={(val) => {
            setCurrentWeightKg(val);
            setError(null);
          }} 
          keyboardType="numeric" 
        />
        
        {error && (
          <Card padding="md" style={{ marginBottom: spacing.lg, borderColor: '#FF6B6B', borderWidth: 1 }}>
            <Text variant="bodySmall" color="secondary" style={{ color: '#FF6B6B' }}>
              {error}
            </Text>
          </Card>
        )}

        {user?.role === 'TRAINER' && (
          <Button
            label="Add course"
            variant="primary"
            onPress={handleAddCourse}
            fullWidth
          />
        )}
        
        <Button 
          label={isLoading ? 'Updating...' : 'Update profile'} 
          onPress={handleProfileUpdate} 
          fullWidth 
          disabled={isLoading}
        />
      </View>
      <Text variant="button" align="center" onPress={handleLogout}>
            Logout
          </Text>
      </>}
      
    </Screen>
  );
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: spacing.xxl, gap: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  info: { flex: 1 },
  displayNameEditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  displayNameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  displayNameSaveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  birthDateLabel: {
    marginBottom: spacing.md,
  },
  birthDatePickerField: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  iosPickerContainer: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  birthDateDoneButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  placeholder: { marginTop: spacing.xxl },
  status: { marginTop: spacing.sm },
  formSection: { 
    paddingHorizontal: spacing.xxl, 
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
});

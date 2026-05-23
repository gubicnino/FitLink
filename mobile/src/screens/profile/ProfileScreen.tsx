import { CommonActions, NavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, PermissionsAndroid, Platform, Pressable, StyleSheet, View } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import apiClient, { API_ORIGIN } from '../../api/apiClient';
import { ScreenHeader } from '../../components/layout';
import { Avatar, Button, Card, Input, Screen, Text } from '../../components/ui';
import { RootStackParamList } from '../../navigation';
import { authService } from '../../services/authService';
import { spacing } from '../../theme';
import { User } from '../../types/types';
const ME_IMG =
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&q=80&auto=format';

export function ProfileScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [user, setUser] = useState<User | null>(null);
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [heightCm, setHeightCm] = useState<string>('');
  const [currentWeightKg, setCurrentWeightKg] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);

  const loadUser = useCallback(async () => {
    const currentUser = await authService.getUser();
    setBirthDate(currentUser?.profile?.birthDate ?? '');
    setGender(currentUser?.profile?.gender ?? '');
    setHeightCm(currentUser?.profile?.heightCm ? currentUser.profile.heightCm.toString() : '');
    setCurrentWeightKg(currentUser?.profile?.currentWeightKg ? currentUser.profile.currentWeightKg.toString() : '');
    setUser(currentUser);
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
      <ScreenHeader title="Profile" />
      <View style={styles.gutter}>
        <Card padding="lg">
          <View style={styles.row}>
            <Pressable onPress={handleAvatarUpload} disabled={isAvatarUploading}>
              <Avatar source={getAvatarSource()} size="xxl" />
            </Pressable>
            <View style={styles.info}>
              <Text variant="h3">{user?.displayName}</Text>
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
        
        
        <Input
          label="Birth date (YYYY-MM-DD)"
          value={birthDate}
          onChangeText={(val) => {
            setBirthDate(val);
            setError(null);
          }}
          placeholder="1990-01-31"
        />
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: spacing.xxl, gap: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  info: { flex: 1 },
  placeholder: { marginTop: spacing.xxl },
  status: { marginTop: spacing.sm },
  formSection: { 
    paddingHorizontal: spacing.xxl, 
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
});

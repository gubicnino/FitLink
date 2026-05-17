import { CommonActions, NavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import apiClient from '../../api/apiClient';
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
            <Avatar source={ME_IMG} size="xxl" />
            <View style={styles.info}>
              <Text variant="h3">{user?.displayName}</Text>
              <Text variant="bodySmall" color="secondary">
                {user?.email}
              </Text>
              {user?.trainer?.verificationStatus ? (
                <Text variant="caption" color="secondary" style={styles.status}>
                  Trainer status: {user.trainer.verificationStatus}
                </Text>
              ) : null}
            </View>
          </View>
        </Card>
        {user?.role === 'ADMIN' ? (
          <Button
            label="Admin Dashboard"
            variant="outline"
            onPress={() => navigation.navigate('AdminApplications')}
            fullWidth
          />
        ) : null}
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

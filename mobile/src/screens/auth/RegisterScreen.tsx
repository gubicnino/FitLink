import type { NavigationProp } from '@react-navigation/native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import apiClient from '../../api/apiClient';
import {
  BrandMark,
  Button,
  Divider,
  Input,
  Screen,
  Text,
} from '../../components/ui';
import type { AuthStackParamList, RootStackParamList } from '../../navigation/types';
import { authService } from '../../services/authService';
import { spacing } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const rootNav = useNavigation<NavigationProp<RootStackParamList>>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [heightCm, setHeightCm] = useState<string>('');
  const [currentWeightKg, setCurrentWeightKg] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      if (password !== confirmPassword) {
        console.error('Passwords do not match');
        return;
      }

      // 1. Firebase ustvari account
      await authService.register(email, password);

      // 2. backend ustvari userja v MongoDB s tvojimi podatki
      await apiClient.post('/auth/register', {
        displayName: name,
        role: 'TRAINEE',
        profile: {
          birthDate: birthDate,
          gender: gender,
          heightCm: heightCm ? Number(heightCm) : null,
          currentWeightKg: currentWeightKg ? Number(currentWeightKg) : null,
        },
      });

      rootNav.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'TraineeRoot' }],
        }),
      );
    } catch (error) {
      await authService.logout().catch(() => {});
      setIsLoading(false);
      console.error(error);
    }
  };

  return (
    <Screen background="surface" keyboardAware scroll contentStyle={styles.content}>
      <View style={styles.brand}>
        <BrandMark size="md" />
      </View>

      <Text variant="display" style={styles.title}>
        Create account
      </Text>
      <Text variant="bodyLarge" color="secondary" style={styles.subtitle}>
        Get started with your training
      </Text>

      <View style={styles.form}>
        <Input label="Full name" value={name} onChangeText={setName} />
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />
        <Input
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <Input
          label="Birth date (YYYY-MM-DD)"
          value={birthDate}
          onChangeText={setBirthDate}
          placeholder="1990-01-31"
        />
        <Input label="Gender" value={gender} onChangeText={setGender} placeholder="male/female/other" />
        <Input label="Height (cm)" value={heightCm} onChangeText={setHeightCm} keyboardType="numeric" />
        <Input label="Current weight (kg)" value={currentWeightKg} onChangeText={setCurrentWeightKg} keyboardType="numeric" />
      </View>

      <Button label="Create account" variant="primary" fullWidth onPress={handleRegister} />

      {isLoading && (
        <View style={styles.loaderOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      )}

      <Divider label="or" style={styles.divider} />

      <View style={styles.flex} />

      <View style={styles.signupRow}>
        <Text variant="body" color="secondary">
          Already have an account?{' '}
        </Text>
        <Text variant="body" color="brand" weight="600" onPress={() => navigation.navigate('Login')}>
          Log in
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.huge,
    paddingBottom: spacing.huge,
    flexGrow: 1,
  },
  brand: { marginBottom: spacing.huge + spacing.xl },
  title: { marginBottom: spacing.md },
  subtitle: { marginBottom: spacing.huge + spacing.md },
  form: { gap: spacing.lg, marginBottom: spacing.md },
  divider: { marginVertical: spacing.xxl },
  flex: { flex: 1, minHeight: spacing.huge },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 1000,
  },
});

export default RegisterScreen;

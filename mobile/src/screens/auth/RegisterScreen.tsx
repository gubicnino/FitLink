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
    GoogleIcon,
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
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    setError('');
    setIsLoading(true);
    authService.beginRegistration();
    try {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }

      // 1. Firebase ustvari account
      await authService.register(email, password);

      // 2. backend ustvari userja v MongoDB s tvojimi podatki
      await apiClient.post('/auth/register', {
        displayName: name,
        role: 'TRAINEE',
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
    } finally {
      authService.endRegistration();
    }
  };

  const handleGoogleRegister = async () => {
    setError('');
    setIsLoading(true);
    authService.beginRegistration();

    try {
      const { user: firebaseUser, googleName } = await authService.getGoogleAuth();
      const displayName =
        googleName?.trim() ||
        'FitLink user';

      setName(displayName);

      await apiClient.post('/auth/register', {
        displayName,
        role: 'TRAINEE',
      });

      rootNav.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'TraineeRoot' }],
        }),
      );
    } catch (error) {
      await authService.logout().catch(() => {});
      setError(error instanceof Error ? error.message : 'Google registration failed. Please try again.');
      console.error('Google registration failed:', error);
    } finally {
      setIsLoading(false);
      authService.endRegistration();
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
        {error ? (
          <View style={styles.errorContainer}>
            <Text variant="bodySmall" weight="600">
              {error}
            </Text>
          </View>
        ) : null}

        <Input label="Full name" value={name} onChangeText={setName} />
        <Input
          label="Email"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setError('');
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setError('');
          }}
          secureTextEntry
          autoComplete="password"
        />
        <Input
          label="Confirm password"
          value={confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(value);
            setError('');
          }}
          secureTextEntry
        />
      </View>
      

      <Button label="Create account" variant="primary" fullWidth onPress={handleRegister} />

      {isLoading && (
        <View style={styles.loaderOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      )}

      <Divider label="or" style={styles.divider} />

      <Button
        label="Sign up with Google"
        variant="ghost"
        fullWidth
        leftIcon={<GoogleIcon size={18} />}
        onPress={handleGoogleRegister}
      />

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
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
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

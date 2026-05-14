import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ClipboardList, Dumbbell } from 'lucide-react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { colors, spacing } from '../../theme';
import { BrandMark, Button, Input, Screen, Text } from '../../components/ui';
import { RoleCard } from './RoleCard';
import type { RootStackParamList } from '../../navigation/types';

type Role = 'trainee' | 'trainer';

export function SignUpScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [name, setName] = useState('Janez Novak');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('••••••••');
  const [confirm, setConfirm] = useState('••••••••');
  const [role, setRole] = useState<Role>('trainee');

  const handleCreate = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: role === 'trainer' ? 'TrainerRoot' : 'TraineeRoot' }],
      }),
    );
  };

  return (
    <Screen background="surface" keyboardAware scroll contentStyle={styles.content}>
      <View style={styles.brand}>
        <BrandMark size="sm" />
      </View>

      <Text variant="h1" style={styles.title}>
        Create your account
      </Text>
      <Text variant="body" color="secondary" style={styles.subtitle}>
        Get started in less than a minute
      </Text>

      <View style={styles.form}>
        <Input label="Display name" size="md" value={name} onChangeText={setName} />
        <Input
          label="Email"
          size="md"
          value={email}
          onChangeText={setEmail}
          placeholder="you@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <View style={styles.row2}>
          <Input
            label="Password"
            size="md"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            containerStyle={styles.col}
          />
          <Input
            label="Confirm"
            size="md"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            containerStyle={styles.col}
          />
        </View>
      </View>

      <Text variant="caption" color="muted" style={styles.rolesLabel}>
        Choose your role
      </Text>
      <View style={styles.roles}>
        <RoleCard
          icon={<Dumbbell size={20} color={colors.primary} strokeWidth={2} />}
          title="I'm training"
          description="Track workouts, follow coach"
          selected={role === 'trainee'}
          onPress={() => setRole('trainee')}
        />
        <RoleCard
          icon={
            <ClipboardList
              size={20}
              color={role === 'trainer' ? colors.primary : colors.inkSecondary}
              strokeWidth={2}
            />
          }
          title="I'm a coach"
          description="Manage clients, create plans"
          selected={role === 'trainer'}
          onPress={() => setRole('trainer')}
        />
      </View>

      <Button label="Create account" variant="primary" fullWidth style={styles.cta} onPress={handleCreate} />

      <Text variant="micro" color="muted" align="center" style={styles.terms}>
        By creating an account you agree to our{' '}
        <Text variant="micro" color="brand" weight="500">
          Terms
        </Text>{' '}
        and{' '}
        <Text variant="micro" color="brand" weight="500">
          Privacy Policy
        </Text>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.huge,
    flexGrow: 1,
  },
  brand: { marginBottom: spacing.huge },
  title: { marginBottom: spacing.xs, fontSize: 26 },
  subtitle: { marginBottom: spacing.xxl },
  form: { gap: spacing.lg, marginBottom: spacing.xxl },
  row2: { flexDirection: 'row', gap: spacing.lg },
  col: { flex: 1 },
  rolesLabel: { marginBottom: spacing.lg },
  roles: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.xxl },
  cta: { marginBottom: spacing.lg },
  terms: { lineHeight: 16, paddingHorizontal: spacing.xl },
});

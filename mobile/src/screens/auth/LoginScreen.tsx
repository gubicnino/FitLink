import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { spacing } from '../../theme';
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

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const rootNav = useNavigation<NavigationProp<RootStackParamList>>();
  const handleLogin = () => {
    rootNav.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'TraineeRoot' }],
      }),
    );
  };
  const [email, setEmail] = useState('janez.novak@email.com');
  const [password, setPassword] = useState('••••••••••');

  return (
    <Screen background="surface" keyboardAware scroll contentStyle={styles.content}>
      <View style={styles.brand}>
        <BrandMark size="md" />
      </View>

      <Text variant="display" style={styles.title}>
        Welcome back
      </Text>
      <Text variant="bodyLarge" color="secondary" style={styles.subtitle}>
        Train smarter with your coach
      </Text>

      <View style={styles.form}>
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
      </View>

      <View style={styles.forgotRow}>
        <Text variant="bodySmall" color="brand" weight="600" onPress={() => {}}>
          Forgot password?
        </Text>
      </View>

      <Button label="Log in" variant="primary" fullWidth onPress={handleLogin} />

      <Divider label="or" style={styles.divider} />

      <Button
        label="Sign in with Google"
        variant="ghost"
        fullWidth
        leftIcon={<GoogleIcon size={18} />}
        onPress={() => {}}
      />

      <View style={styles.flex} />

      <View style={styles.signupRow}>
        <Text variant="body" color="secondary">
          Don&apos;t have an account?{' '}
        </Text>
        <Text
          variant="body"
          color="brand"
          weight="600"
          onPress={() => navigation.navigate('SignUp')}
        >
          Sign up
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
  forgotRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.xxl,
  },
  divider: { marginVertical: spacing.xxl },
  flex: { flex: 1, minHeight: spacing.huge },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

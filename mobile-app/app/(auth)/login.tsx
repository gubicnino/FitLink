import { router } from 'expo-router'
import React, { useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import apiClient from '@/api/apiClient'
import {
  BrandMark,
  Button,
  Divider,
  GoogleIcon,
  Input,
  Screen,
  Text,
} from '@/components/ui'
import { authService } from '@/services/authService'
import { useGoogleSignIn } from '@/services/googleSignIn'
import { spacing } from '@/constants/theme'

export default function Login() {
  const { signInWithGoogle } = useGoogleSignIn()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // After a successful login the root layout's auth effect redirects to the
  // correct role tabs once the backend user resolves, so screens no longer
  // navigate imperatively.
  const verifyBackendUser = async () => {
    const response = await apiClient.post('/auth/login')
    if (!response.data || !response.data.id) {
      await authService.logout()
      throw new Error('User not found in database')
    }
  }

  const handleLogin = async () => {
    setError('')
    setIsLoading(true)
    try {
      await authService.login(email, password)
      try {
        await verifyBackendUser()
      } catch (backendError) {
        await authService.logout()
        throw backendError
      }
    } catch (err) {
      setIsLoading(false)
      const errorMessage = err instanceof Error ? err.message : 'Login failed. Please try again.'
      setError(errorMessage)
      console.error('Login failed:', err)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setIsLoading(true)
    try {
      await signInWithGoogle()
      try {
        await verifyBackendUser()
      } catch (backendError) {
        await authService.logout()
        throw backendError
      }
    } catch (err) {
      setIsLoading(false)
      const errorMessage = err instanceof Error ? err.message : 'Login failed. Please try again.'
      setError(errorMessage)
      console.error('Login failed:', err)
    }
  }

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
          onChangeText={(value) => {
            setEmail(value)
            setError('')
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={(value) => {
            setPassword(value)
            setError('')
          }}
          secureTextEntry
          autoComplete="password"
        />
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text variant="bodySmall" weight="600">
            {error}
          </Text>
        </View>
      )}

      <View style={styles.forgotRow}>
        <Text variant="bodySmall" color="brand" weight="600" onPress={() => {}}>
          Forgot password?
        </Text>
      </View>

      <Button label="Log in" variant="primary" fullWidth onPress={handleLogin} />

      {isLoading && (
        <View style={styles.loaderOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      )}

      <Divider label="or" style={styles.divider} />

      <Button
        label="Sign in with Google"
        variant="ghost"
        fullWidth
        leftIcon={<GoogleIcon size={18} />}
        onPress={handleGoogleLogin}
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
          onPress={() => router.push('/(auth)/register')}
        >
          Sign up
        </Text>
      </View>
    </Screen>
  )
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
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
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
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 1000,
  },
})

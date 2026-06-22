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

export default function Register() {
  const { signInWithGoogle } = useGoogleSignIn()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // The root layout's auth effect redirects to the trainee tabs once the
  // backend user resolves, so registration no longer navigates imperatively.
  const handleRegister = async () => {
    setError('')
    setIsLoading(true)
    authService.beginRegistration()
    try {
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        setIsLoading(false)
        return
      }

      // 1. Firebase creates the account
      await authService.register(email, password)

      // 2. backend creates the user in MongoDB with the provided details
      await apiClient.post('/auth/register', {
        displayName: name,
        role: 'TRAINEE',
      })
    } catch (error) {
      await authService.logout().catch(() => {})
      setIsLoading(false)
      console.error(error)
    } finally {
      authService.endRegistration()
    }
  }

  const handleGoogleRegister = async () => {
    setError('')
    setIsLoading(true)
    authService.beginRegistration()
    try {
      const cred = await signInWithGoogle()
      const displayName = cred.user.displayName?.trim() || 'FitLink user'
      setName(displayName)

      await apiClient.post('/auth/register', {
        displayName,
        role: 'TRAINEE',
      })
    } catch (error) {
      await authService.logout().catch(() => {})
      setError(
        error instanceof Error ? error.message : 'Google registration failed. Please try again.',
      )
      console.error('Google registration failed:', error)
    } finally {
      setIsLoading(false)
      authService.endRegistration()
    }
  }

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
        <Input
          label="Confirm password"
          value={confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(value)
            setError('')
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
        <Text variant="body" color="brand" weight="600" onPress={() => router.push('/(auth)/login')}>
          Log in
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
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 1000,
  },
})

import { router } from 'expo-router'
import React, { useState } from 'react'
import { Alert, ScrollView, StyleSheet, View } from 'react-native'
import { ChevronLeft } from 'lucide-react-native'
import { Button, IconButton, Input, Screen, Text } from '@/components/ui'
import { ScreenHeader } from '@/components/layout'
import { healthApi, type HealthSnapshotUpload } from '@/api/healthApi'
import { colors, spacing } from '@/constants/theme'

type FieldKey =
  | 'weight'
  | 'steps'
  | 'activeCalories'
  | 'totalCalories'
  | 'distance'
  | 'heartRate'
  | 'restingHeartRate'
  | 'sleepDuration'
  | 'hydration'

const FIELDS: { key: FieldKey; label: string }[] = [
  { key: 'weight', label: 'Weight (kg)' },
  { key: 'steps', label: 'Steps' },
  { key: 'activeCalories', label: 'Active calories (kcal)' },
  { key: 'totalCalories', label: 'Total calories (kcal)' },
  { key: 'distance', label: 'Distance (m)' },
  { key: 'heartRate', label: 'Heart rate (bpm)' },
  { key: 'restingHeartRate', label: 'Resting heart rate (bpm)' },
  { key: 'sleepDuration', label: 'Sleep duration (hours)' },
  { key: 'hydration', label: 'Hydration (ml)' },
]

const numOrNull = (v: string): number | null => {
  const n = Number(v)
  return v.trim() !== '' && Number.isFinite(n) ? n : null
}

/**
 * iOS manual health entry. Health Connect is Android-only, so iOS users enter
 * their daily metrics here. Maps the form into the backend HealthSnapshotDto
 * (PUT /health/me/snapshot via healthApi.uploadMine).
 */
export default function HealthManual() {
  const [values, setValues] = useState<Record<FieldKey, string>>({
    weight: '',
    steps: '',
    activeCalories: '',
    totalCalories: '',
    distance: '',
    heartRate: '',
    restingHeartRate: '',
    sleepDuration: '',
    hydration: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const setField = (key: FieldKey, v: string) =>
    setValues((prev) => ({ ...prev, [key]: v }))

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const now = new Date().toISOString()
      const weight = numOrNull(values.weight)
      const heartRate = numOrNull(values.heartRate)
      const sleepHours = numOrNull(values.sleepDuration)

      const payload: HealthSnapshotUpload = {
        stepsToday: numOrNull(values.steps) ?? 0,
        activeCaloriesToday: numOrNull(values.activeCalories) ?? 0,
        totalCaloriesToday: numOrNull(values.totalCalories) ?? 0,
        distanceMetersToday: numOrNull(values.distance) ?? 0,
        floorsToday: 0,
        steps7d: [],

        latestWeightKg: weight,
        latestWeightAt: weight != null ? now : null,
        weightTrend: weight != null ? [{ at: now, kg: weight }] : [],
        bodyFatPercent: null,
        heightCm: null,
        bmrKcal: null,

        latestHeartRateBpm: heartRate,
        latestHeartRateAt: heartRate != null ? now : null,
        restingHeartRate: numOrNull(values.restingHeartRate),
        lastSleepMinutes: sleepHours != null ? Math.round(sleepHours * 60) : null,
        lastSleepEndedAt: sleepHours != null ? now : null,
        avgSleepMinutes7d: null,
        vo2Max: null,

        oxygenSaturation: null,
        respiratoryRate: null,
        bodyTemperatureC: null,
        bloodPressureSystolic: null,
        bloodPressureDiastolic: null,

        hydrationMlToday: numOrNull(values.hydration) ?? 0,

        recentExercises: [],
      }

      await healthApi.uploadMine(payload)
      Alert.alert('Saved', 'Your health data has been updated.')
      router.back()
    } catch (err) {
      console.error('Manual health submit failed:', err)
      Alert.alert('Error', 'Could not save your health data. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Screen background="surface">
      <ScreenHeader
        title="Manual entry"
        left={
          <IconButton variant="surface" withBorder onPress={() => router.back()}>
            <ChevronLeft size={18} color={colors.inkPrimary} strokeWidth={2.25} />
          </IconButton>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="body" color="secondary" style={styles.intro}>
          Enter today&apos;s health metrics. Leave any field blank to skip it.
        </Text>
        <View style={styles.form}>
          {FIELDS.map((f) => (
            <Input
              key={f.key}
              label={f.label}
              value={values[f.key]}
              onChangeText={(v) => setField(f.key, v)}
              keyboardType="numeric"
            />
          ))}
        </View>
        <Button
          label={submitting ? 'Saving…' : 'Save'}
          variant="primary"
          fullWidth
          onPress={handleSubmit}
        />
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.lg },
  intro: { marginBottom: spacing.sm },
  form: { gap: spacing.lg, marginBottom: spacing.md },
})

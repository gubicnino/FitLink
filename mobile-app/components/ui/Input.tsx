import React from 'react';
import {
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { Text } from './Text';

interface InputProps extends TextInputProps {
  label?: string;
  containerStyle?: StyleProp<ViewStyle>;
  size?: 'md' | 'lg';
}

export function Input({ label, containerStyle, size = 'lg', style, ...rest }: InputProps) {
  const height = size === 'lg' ? 48 : 44;
  return (
    <View style={containerStyle}>
      {label ? (
        <Text variant="caption" color="muted" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.inkMuted}
        {...rest}
        style={[styles.input, { height }, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.xl,
    color: colors.inkPrimary,
    fontSize: typography.bodyLarge.fontSize,
  },
});

import React from 'react';
import { StyleProp, StyleSheet, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { Text } from './Text';

interface TextareaProps extends TextInputProps {
  label?: string;
  containerStyle?: StyleProp<ViewStyle>;
  rows?: number;
}

export function Textarea({
  label,
  containerStyle,
  rows = 3,
  style,
  ...rest
}: TextareaProps) {
  return (
    <View style={containerStyle}>
      {label ? (
        <Text variant="caption" color="muted" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <TextInput
        multiline
        textAlignVertical="top"
        numberOfLines={rows}
        placeholderTextColor={colors.inkMuted}
        {...rest}
        style={[styles.input, { minHeight: rows * 22 + 24 }, style]}
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
    padding: spacing.lg,
    color: colors.inkPrimary,
    fontSize: typography.bodySmall.fontSize,
    lineHeight: 20,
  },
});

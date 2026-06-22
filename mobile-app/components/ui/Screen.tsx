import React from 'react';
import {
  ScrollView,
  StyleSheet,
  StyleProp,
  View,
  ViewStyle,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  dark?: boolean;
  background?: 'bg' | 'surface';
  edges?: readonly Edge[];
  keyboardAware?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  scroll = false,
  dark = false,
  background = 'bg',
  edges = ['top', 'bottom'],
  keyboardAware = false,
  contentStyle,
  style,
}: ScreenProps) {
  const bg = dark
    ? colors.dark.bg
    : background === 'surface'
      ? colors.surface
      : colors.bg;

  const Content = scroll ? ScrollView : View;
  const contentProps = scroll
    ? {
        contentContainerStyle: [styles.scrollContent, contentStyle],
        showsVerticalScrollIndicator: false,
        keyboardShouldPersistTaps: 'handled' as const,
      }
    : { style: [styles.staticContent, contentStyle] };

  const inner = (
    <Content {...(contentProps as object)}>{children}</Content>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.safe, { backgroundColor: bg }, style]}>
      {keyboardAware ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  staticContent: { flex: 1 },
});

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../../theme';
import { Screen, Text } from '../../components/ui';
import { ScreenHeader } from '../../components/layout';

export function LibraryScreen() {
  return (
    <Screen scroll edges={['top']}>
      <ScreenHeader title="Library" />
      <View style={styles.center}>
        <Text variant="body" color="secondary" align="center">
          Exercise library and templates coming next.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { paddingHorizontal: spacing.xxl, paddingTop: spacing.huge },
});

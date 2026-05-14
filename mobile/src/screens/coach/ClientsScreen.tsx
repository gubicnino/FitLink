import React from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../../theme';
import { Screen, Text } from '../../components/ui';
import { ScreenHeader } from '../../components/layout';

export function ClientsScreen() {
  return (
    <Screen scroll edges={['top']}>
      <ScreenHeader title="Clients" />
      <View style={styles.center}>
        <Text variant="body" color="secondary" align="center">
          Full client list coming next.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { paddingHorizontal: spacing.xxl, paddingTop: spacing.huge },
});

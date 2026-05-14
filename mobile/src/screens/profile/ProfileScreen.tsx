import React from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../../theme';
import { Avatar, Card, Screen, Text } from '../../components/ui';
import { ScreenHeader } from '../../components/layout';

const ME_IMG =
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&q=80&auto=format';

export function ProfileScreen() {
  return (
    <Screen scroll edges={['top']}>
      <ScreenHeader title="Profile" />
      <View style={styles.gutter}>
        <Card padding="lg">
          <View style={styles.row}>
            <Avatar source={ME_IMG} size="xxl" />
            <View style={styles.info}>
              <Text variant="h3">Janez Novak</Text>
              <Text variant="bodySmall" color="secondary">
                janez.novak@email.com
              </Text>
            </View>
          </View>
        </Card>
        <Text variant="bodySmall" color="secondary" style={styles.placeholder} align="center">
          Profile screen — settings, plan, account, support coming next.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: spacing.xxl, gap: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  info: { flex: 1 },
  placeholder: { marginTop: spacing.xxl },
});

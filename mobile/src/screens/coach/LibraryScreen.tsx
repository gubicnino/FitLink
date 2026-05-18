import React from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../../theme';
import { Button, Screen, Text } from '../../components/ui';
import { ScreenHeader } from '../../components/layout';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/types';

export function LibraryScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    <Screen scroll edges={['top']}>
      <ScreenHeader title="Library" />
      <View style={styles.center}>
        <Text variant="body" color="secondary" align="center">
          Exercise library and templates coming next.
        </Text>
        <Button
          label="Add course"
          variant="primary"
          fullWidth
          onPress={() => navigation.navigate('AddCourses')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { paddingHorizontal: spacing.xxl, paddingTop: spacing.huge, gap: spacing.xl },
});

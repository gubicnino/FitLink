import { CommonActions, NavigationProp, useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ScreenHeader } from '../../components/layout';
import { Avatar, Card, Screen, Text } from '../../components/ui';
import { RootStackParamList } from '../../navigation';
import { authService } from '../../services/authService';
import { spacing } from '../../theme';
import { User } from '../../types/types';
const ME_IMG =
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&q=80&auto=format';


export function ProfileScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const currentUser = await authService.getUser();
      setUser(currentUser);
    };

    getUser();
  }, [])

  const handleLogout = async () => {
    await authService.logout();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      }),
    );
  };

  return (
    <Screen scroll edges={['top']}>
      <ScreenHeader title="Profile" />
      <View style={styles.gutter}>
        <Card padding="lg">
          <View style={styles.row}>
            <Avatar source={ME_IMG} size="xxl" />
            <View style={styles.info}>
              <Text variant="h3">{user?.displayName}</Text>
              <Text variant="bodySmall" color="secondary">
                {user?.email}
              </Text>
            </View>
          </View>
        </Card>
        <Text variant="bodySmall" color="secondary" style={styles.placeholder} align="center">
          Profile screen — settings, plan, account, support coming next.
        </Text>
          <Text variant="button" align="center" onPress={handleLogout}>
            Logout
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

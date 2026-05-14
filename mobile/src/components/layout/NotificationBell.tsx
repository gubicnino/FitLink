import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { colors } from '../../theme';
import { IconButton } from '../ui/IconButton';

interface NotificationBellProps {
  hasUnread?: boolean;
  onPress?: () => void;
}

export function NotificationBell({ hasUnread = false, onPress }: NotificationBellProps) {
  return (
    <View style={styles.wrapper}>
      <IconButton variant="surface" withBorder size="lg" onPress={onPress}>
        <Bell size={18} color={colors.inkPrimary} strokeWidth={1.75} />
      </IconButton>
      {hasUnread ? <View style={styles.dot} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  dot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
});

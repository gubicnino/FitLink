import React from 'react';
import { Image, ImageSourcePropType, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radii } from '../../theme';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

const sizeMap: Record<AvatarSize, number> = {
  xs: 20,
  sm: 28,
  md: 36,
  lg: 40,
  xl: 48,
  xxl: 64,
};

interface AvatarProps {
  source: ImageSourcePropType | string;
  size?: AvatarSize;
  rounded?: 'pill' | 'lg';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Avatar({ source, size = 'lg', rounded = 'pill', style, testID }: AvatarProps) {
  const dim = sizeMap[size];
  const borderRadius = rounded === 'pill' ? dim / 2 : radii.xl;
  const imgSource: ImageSourcePropType =
    typeof source === 'string' ? { uri: source } : source;
  return (
    <View
      style={[
        styles.container,
        { width: dim, height: dim, borderRadius, backgroundColor: colors.surfaceElevated },
        style,
      ]}
      testID={testID}
    >
      <Image source={imgSource} style={{ width: dim, height: dim, borderRadius }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
});

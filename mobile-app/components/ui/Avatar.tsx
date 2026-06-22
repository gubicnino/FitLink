import React from 'react';
import { Image, ImageSourcePropType, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { UserRound } from 'lucide-react-native';
import { colors, radii } from '@/constants/theme';

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
  source: ImageSourcePropType | string | React.ReactElement;
  size?: AvatarSize;
  rounded?: 'pill' | 'lg';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Avatar({ source, size = 'lg', rounded = 'pill', style, testID }: AvatarProps) {
  const dim = sizeMap[size];
  const borderRadius = rounded === 'pill' ? dim / 2 : radii.xl;
  let imgSource: ImageSourcePropType | undefined = undefined;
  const isElement = React.isValidElement(source);
  const isSvgDataUri = typeof source === 'string' && source.startsWith('data:image/svg+xml');
  if (!isElement) {
    imgSource = typeof source === 'string' ? { uri: source } : (source as ImageSourcePropType);
  }
  return (
    <View
      style={[
        styles.container,
        { width: dim, height: dim, borderRadius, backgroundColor: colors.surfaceElevated },
        style,
      ]}
      testID={testID}
    >
      {isElement ? (
        React.cloneElement(source as React.ReactElement<{ size?: number }>, { size: dim })
      ) : isSvgDataUri ? (
        <View style={[styles.fallback, { width: dim, height: dim, borderRadius }]}>
          <UserRound size={Math.round(dim * 0.58)} color={colors.primary} strokeWidth={2} />
        </View>
      ) : (
        <Image source={imgSource} style={{ width: dim, height: dim, borderRadius }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
});

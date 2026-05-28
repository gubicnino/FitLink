import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { colors } from '../../theme';
import { FitLinkMark } from './FitLinkMark';

interface SplashScreenProps {
  /**
   * Parent's signal that the underlying app is ready (auth resolved, etc).
   * The splash will only start exiting once this is true AND the internal
   * minimum-visible timer has elapsed.
   */
  appReady: boolean;
  onExited?: () => void;
  /**
   * When true and not exiting, the logo plays a subtle pulse to indicate
   * background work (auth check, etc).
   */
  busy?: boolean;
  /**
   * Minimum time the RN splash stays visible after it first mounts.
   * Measured from this component's mount (not from app launch), so the
   * native pre-JS splash window does NOT eat into this duration —
   * the user always gets the full animated brand reveal once JS is up.
   */
  minDurationMs?: number;
}

const LOGO_SIZE = 96;

const DEFAULT_MIN_DURATION_MS = 1600;

export function SplashScreen({
  appReady,
  onExited,
  busy,
  minDurationMs = DEFAULT_MIN_DURATION_MS,
}: SplashScreenProps) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.92)).current;
  const wordOpacity = useRef(new Animated.Value(0)).current;
  const wordTranslate = useRef(new Animated.Value(8)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const containerScale = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const reducedMotionRef = useRef(false);
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Local minimum-visible timer — starts when THIS component mounts, NOT
  // when the app process launches. The native splash window has already
  // burned an unknown amount of time before we got here; we don't want
  // that to count against the animated reveal the user expects to see.
  const [minElapsed, setMinElapsed] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setMinElapsed(true), minDurationMs);
    return () => clearTimeout(id);
  }, [minDurationMs]);

  const exiting = appReady && minElapsed;

  // Enter animation
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        reducedMotionRef.current = await AccessibilityInfo.isReduceMotionEnabled();
      } catch {
        reducedMotionRef.current = false;
      }
      if (cancelled) return;

      if (reducedMotionRef.current) {
        Animated.parallel([
          Animated.timing(logoOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.timing(wordOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
        ]).start();
        logoScale.setValue(1);
        wordTranslate.setValue(0);
        return;
      }

      Animated.sequence([
        Animated.parallel([
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(logoScale, {
            toValue: 1,
            duration: 380,
            easing: Easing.out(Easing.back(1.2)),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(wordOpacity, {
            toValue: 1,
            duration: 280,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(wordTranslate, {
            toValue: 0,
            duration: 280,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    })();
    return () => {
      cancelled = true;
    };
  }, [logoOpacity, logoScale, wordOpacity, wordTranslate]);

  // Idle pulse while busy
  useEffect(() => {
    if (reducedMotionRef.current) return;
    if (!busy || exiting) {
      pulseLoopRef.current?.stop();
      pulseLoopRef.current = null;
      Animated.timing(pulse, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.04,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoopRef.current = loop;
    loop.start();
    return () => {
      loop.stop();
    };
  }, [busy, exiting, pulse]);

  // Exit animation
  useEffect(() => {
    if (!exiting) return;
    const dur = reducedMotionRef.current ? 120 : 280;
    Animated.parallel([
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: dur,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(containerScale, {
        toValue: reducedMotionRef.current ? 1 : 1.04,
        duration: dur,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished && onExited) onExited();
    });
  }, [exiting, containerOpacity, containerScale, onExited]);

  return (
    <Animated.View
      pointerEvents={exiting ? 'none' : 'auto'}
      style={[
        styles.root,
        {
          opacity: containerOpacity,
          transform: [{ scale: containerScale }],
        },
      ]}
    >
      <StatusBar
        translucent
        barStyle="light-content"
        backgroundColor="transparent"
      />

      {/* Subtle radial glow — top-right, primary-dark — gives depth without distraction */}
      <View pointerEvents="none" style={styles.glow} />
      <View pointerEvents="none" style={styles.glowBottom} />

      <View style={styles.center}>
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: Animated.multiply(logoScale, pulse) }],
          }}
        >
          <FitLinkMark size={LOGO_SIZE} tone="light" />
        </Animated.View>

        <Animated.Text
          style={[
            styles.wordmark,
            {
              opacity: wordOpacity,
              transform: [{ translateY: wordTranslate }],
            },
          ]}
        >
          FitLink
        </Animated.Text>

        <Animated.Text
          style={[
            styles.tagline,
            {
              opacity: wordOpacity,
              transform: [{ translateY: wordTranslate }],
            },
          ]}
        >
          Train. Coach. Connect.
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  glow: {
    position: 'absolute',
    top: -120,
    right: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: colors.primaryDark,
    opacity: 0.55,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -160,
    left: -100,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: colors.primaryDark,
    opacity: 0.35,
  },
  center: {
    alignItems: 'center',
    gap: 18,
  },
  wordmark: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 4,
  },
  tagline: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
});

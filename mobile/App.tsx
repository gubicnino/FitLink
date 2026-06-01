import React, { useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from './src/hooks/useAuth';
import { useFcmRegistration } from './src/hooks/useFcmRegistration';
import { useHealthSync } from './src/hooks/useHealthSync';
import { RootNavigator } from './src/navigation';
import { colors } from './src/theme';
import { SplashScreen } from './src/components/brand';

const MIN_SPLASH_MS = 1600;

function App() {
  const { user, loading } = useAuth();
  const [splashGone, setSplashGone] = useState(false);
  useFcmRegistration();
  useHealthSync();

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

        <View style={styles.flex}>
          <RootNavigator user={user} />
        </View>

        {!splashGone ? (
          <SplashScreen
            appReady={!loading}
            busy={loading}
            minDurationMs={MIN_SPLASH_MS}
            onExited={() => setSplashGone(true)}
          />
        ) : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});

export default App;

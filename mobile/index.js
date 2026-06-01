/**
 * @format
 */


import { TextEncoder, TextDecoder } from 'text-encoding';
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';
import { triggerHealthSync } from './src/services/healthSyncService';

messaging().setBackgroundMessageHandler(async remote => {
  const data = remote?.data ?? {};
  if (data.type === 'health_sync_request') {
    await triggerHealthSync();
  }
});

AppRegistry.registerComponent(appName, () => App);

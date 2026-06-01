/**
 * @format
 */


import { TextDecoder, TextEncoder } from 'text-encoding';
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

import messaging from '@react-native-firebase/messaging';
import { AppRegistry } from 'react-native';
import 'react-native-gesture-handler';
import App from './App';
import { name as appName } from './app.json';
import './src/services/googleConfig';
import { triggerHealthSync } from './src/services/healthSyncService';

messaging().setBackgroundMessageHandler(async remote => {
  const data = remote?.data ?? {};
  if (data.type === 'health_sync_request') {
    await triggerHealthSync();
  }
});

AppRegistry.registerComponent(appName, () => App);

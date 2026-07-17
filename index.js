// Polyfill crypto.getRandomValues() before anything else imports crypto-js.
// Required for AES + nonce generation in src/crypto/qrCrypto.js
import 'react-native-get-random-values';

import { Platform } from 'react-native';
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// Service worker (PWA, app shell only) — voir workbox-config.js pour le scope
// exact du cache. Différé au `load` pour ne pas retarder le premier rendu.
if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

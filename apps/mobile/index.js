/**
 * @format
 */

// Metro's serializer uses getModulesRunBeforeMainModule to run InitializeCore
// as a prelude (__r call before the entry point). With pnpm symlinks, the path
// matching between require.resolve (realpath) and Metro's module graph (symlink
// path) fails silently, so the prelude is never generated. Importing it
// explicitly ensures the RN runtime (HMRClient, RCTDeviceEventEmitter, etc.)
// initializes before any native calls into JS.
import 'react-native/Libraries/Core/InitializeCore';
// Hermes doesn't provide crypto.getRandomValues (facebook/hermes#915).
// Polyfill must load before @noble/hashes, @noble/ciphers, uuid, or anything
// that calls globalThis.crypto.getRandomValues.
import 'react-native-get-random-values';
import { AppRegistry, LogBox } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// React 19 Fabric renderer dev-mode false positive
LogBox.ignoreLogs(['Internal React error: Expected static flag was missing']);

AppRegistry.registerComponent(appName, () => App);

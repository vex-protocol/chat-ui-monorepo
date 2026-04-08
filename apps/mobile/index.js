// Hermes doesn't provide crypto.getRandomValues (facebook/hermes#915).
// Polyfill must load before anything that calls globalThis.crypto.getRandomValues.
import 'react-native-get-random-values';
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);

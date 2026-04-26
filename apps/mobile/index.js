// Hermes doesn't provide crypto.getRandomValues (facebook/hermes#915).
// Polyfill must load before anything that calls globalThis.crypto.getRandomValues.
import "react-native-get-random-values";
import { LogBox } from "react-native";

import { registerRootComponent } from "expo";

import App from "./App";

if (__DEV__) {
    LogBox.ignoreLogs([
        "Call to function 'ExpoKeepAwake.activate' has been rejected",
    ]);
}

registerRootComponent(App);

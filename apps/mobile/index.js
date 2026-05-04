// Hermes doesn't provide crypto.getRandomValues (facebook/hermes#915).
// Polyfill must load before anything that calls globalThis.crypto.getRandomValues.
import "react-native-get-random-values";
import { LogBox, Platform } from "react-native";

import notifee, { EventType } from "@notifee/react-native";
import { registerRootComponent } from "expo";

import App from "./App";

if (Platform.OS === "android") {
    notifee.onBackgroundEvent(async ({ detail, type }) => {
        if (type !== EventType.PRESS) {
            return;
        }
        const data = detail.notification?.data;
        if (!data || (data.kind !== "dm" && data.kind !== "group")) {
            return;
        }
        const { enqueueNotificationRouteFromAndroidBackground } = await import(
            "./src/lib/notifications",
        );
        enqueueNotificationRouteFromAndroidBackground(data);
    });
}

if (__DEV__) {
    LogBox.ignoreLogs([
        "Call to function 'ExpoKeepAwake.activate' has been rejected",
    ]);
}

registerRootComponent(App);

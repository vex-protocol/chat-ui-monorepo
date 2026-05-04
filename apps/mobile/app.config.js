// Dynamic Expo config. app.json is the static base; this file overlays
// profile-conditional fields so `development` and `production` EAS build
// profiles can produce two distinct APKs that can coexist on one device.
//
//   default (all profiles)             → production flavor
//   VEX_ENABLE_DEV_BUILD=1 + profile=development → dev flavor (opt-in)
//   env override                        → VEX_IOS_BUNDLE_IDENTIFIER (optional)
//
// The release APK has updates.enabled:false hard-baked into the native
// config — no EAS Update runtime, no network calls, no OTA code path.
//
// CJS intentional: apps/mobile/package.json has no "type":"module", so
// a plain require('./package.json') is the simplest single-source-of-truth
// for the version field. release-pr.yml bumps package.json; app.config.js
// reads it here; the APK's visible version follows automatically.

const pkg = require("./package.json");

// EAS Update requires a stable project id to resolve the update channel.
// Created via the Expo dashboard — paired with EXPO_TOKEN in CI secrets.
const EAS_PROJECT_ID = "e0d4cba7-1f2a-4c26-9e66-1fd60178ad20";

module.exports = ({ config }) => {
    const devFlavorEnabled = process.env.VEX_ENABLE_DEV_BUILD === "1";
    const devMode =
        devFlavorEnabled && process.env.EAS_BUILD_PROFILE === "development";
    const iconPath = devMode
        ? "./assets/icon-dev.png"
        : "./assets/icon-prod.png";
    const iosBundleIdentifier =
        process.env.VEX_IOS_BUNDLE_IDENTIFIER ||
        (devMode ? "chat.vex.mobile.dev" : config.ios?.bundleIdentifier);

    // Permissions required for the optional "Always-on connection"
    // foreground-service mode (Settings → Connection). Even when the
    // user never opts in, declaring these is harmless — Android only
    // grants what the app actually requests at runtime.
    const androidPermissions = Array.from(
        new Set([
            ...(config.android?.permissions ?? []),
            "FOREGROUND_SERVICE",
            "FOREGROUND_SERVICE_DATA_SYNC",
            "WAKE_LOCK",
        ]),
    );

    return {
        ...config,
        version: pkg.version,
        name: devMode ? "Vex Beta" : config.name,
        icon: iconPath,
        splash: {
            backgroundColor: "#0a0a0a",
            image: iconPath,
            resizeMode: "contain",
        },
        ios: {
            ...config.ios,
            bundleIdentifier: iosBundleIdentifier,
        },
        android: {
            ...config.android,
            adaptiveIcon: {
                backgroundColor: "#0a0a0a",
                foregroundImage: iconPath,
            },
            package: devMode ? "chat.vex.mobile.dev" : config.android?.package,
            permissions: androidPermissions,
        },
        updates: { enabled: false },
        runtimeVersion: devMode
            ? { policy: "fingerprint" }
            : { policy: "appVersion" },
        extra: {
            ...config.extra,
            eas: { projectId: EAS_PROJECT_ID },
        },
        plugins: [
            ...(config.plugins ?? []),
            "expo-background-task",
            "./plugins/withForegroundService",
            // Safety net for Notifee FGS small-icon resolution.
            // expo-notifications' density-specific
            // `notification_icon.png` files normally win on real
            // devices, but if any density bucket is missing the FGS
            // crashes the entire app. This plugin guarantees the
            // catch-all `@drawable/notification_icon` always
            // resolves to a valid white-on-transparent vector.
            "./plugins/withNotificationIcon",
        ],
    };
};

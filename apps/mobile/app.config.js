// Dynamic Expo config. app.json is the static base; this file overlays
// profile-conditional fields so the `development` and `production` EAS
// build profiles produce two distinct APKs that can coexist on one device.
//
//   development profile → "Vex Beta", chat.vex.mobile.dev,  OTA enabled
//   production  profile → "Vex",      chat.vex.mobile,      OTA disabled
//   env override         → VEX_IOS_BUNDLE_IDENTIFIER (optional)
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
    const devMode = process.env.EAS_BUILD_PROFILE === "development";
    const iconPath = devMode
        ? "./assets/icon-dev.png"
        : "./assets/icon-prod.png";
    const iosBundleIdentifier =
        process.env.VEX_IOS_BUNDLE_IDENTIFIER ||
        (devMode ? "chat.vex.mobile.dev" : config.ios?.bundleIdentifier);

    return {
        ...config,
        version: pkg.version,
        name: devMode ? "Vex Beta" : config.name,
        icon: iconPath,
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
        },
        updates: devMode
            ? {
                  enabled: true,
                  url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
                  fallbackToCacheTimeout: 0,
                  checkAutomatically: "ON_LOAD",
              }
            : { enabled: false },
        runtimeVersion: devMode
            ? { policy: "fingerprint" }
            : { policy: "appVersion" },
        extra: {
            ...config.extra,
            eas: { projectId: EAS_PROJECT_ID },
        },
        plugins: [...(config.plugins ?? []), "expo-background-task"],
    };
};

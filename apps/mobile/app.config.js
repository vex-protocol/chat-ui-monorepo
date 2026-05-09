// Dynamic Expo config. app.json is the static base; this file overlays
// profile-conditional fields so `development` and `production` EAS build
// profiles can produce two distinct APKs that can coexist on one device.
//
//   default (all profiles)             → production flavor
//   VEX_ENABLE_DEV_BUILD=1 + profile=development → dev flavor (opt-in)
//   env override                        → VEX_IOS_BUNDLE_IDENTIFIER (optional)
//   local personal-team iOS builds      → VEX_DISABLE_IOS_CAPABILITIES=1
//
// The release APK has updates.enabled:false hard-baked into the native
// config — no EAS Update runtime, no network calls, no OTA code path.
//
// CJS intentional: apps/mobile/package.json has no "type":"module", so
// a plain require('./package.json') is the simplest single-source-of-truth
// for the version field. release-pr.yml bumps package.json; app.config.js
// reads it here; the APK's visible version follows automatically.

const pkg = require("./package.json");
const { withEntitlementsPlist } = require("expo/config-plugins");

// EAS Update requires a stable project id to resolve the update channel.
// Created via the Expo dashboard — paired with EXPO_TOKEN in CI secrets.
const EAS_PROJECT_ID = "e0d4cba7-1f2a-4c26-9e66-1fd60178ad20";

const withoutPersonalTeamUnsupportedIosCapabilities = (config) =>
    withEntitlementsPlist(config, (modConfig) => {
        delete modConfig.modResults["aps-environment"];
        delete modConfig.modResults["com.apple.developer.associated-domains"];
        return modConfig;
    });

module.exports = ({ config }) => {
    const devFlavorEnabled = process.env.VEX_ENABLE_DEV_BUILD === "1";
    const devMode =
        devFlavorEnabled && process.env.EAS_BUILD_PROFILE === "development";
    const iosCapabilitiesEnabled =
        process.env.VEX_DISABLE_IOS_CAPABILITIES !== "1";
    const iconPath = devMode
        ? "./assets/icon-dev.png"
        : "./assets/icon-prod.png";
    const androidAdaptiveForegroundPath = devMode
        ? "./assets/icon-dev-android.png"
        : "./assets/icon-prod-android.png";
    const iosBundleIdentifier =
        process.env.VEX_IOS_BUNDLE_IDENTIFIER ||
        (devMode ? "chat.vex.mobile.dev" : config.ios?.bundleIdentifier);
    const androidGoogleServicesFile =
        process.env.VEX_ANDROID_GOOGLE_SERVICES_FILE ||
        config.android?.googleServicesFile;

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
        name: devMode ? "Vex Developer" : config.name,
        icon: iconPath,
        splash: {
            backgroundColor: "#0a0a0a",
            image: iconPath,
            resizeMode: "contain",
        },
        ios: {
            ...config.ios,
            bundleIdentifier: iosBundleIdentifier,
            associatedDomains: iosCapabilitiesEnabled
                ? config.ios?.associatedDomains
                : undefined,
        },
        android: {
            ...config.android,
            adaptiveIcon: {
                backgroundColor: "#0a0a0a",
                foregroundImage: androidAdaptiveForegroundPath,
            },
            package: devMode ? "chat.vex.mobile.dev" : config.android?.package,
            ...(androidGoogleServicesFile
                ? { googleServicesFile: androidGoogleServicesFile }
                : {}),
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
            ...(config.plugins ?? []).filter((plugin) => {
                if (iosCapabilitiesEnabled) return true;
                if (plugin === "expo-notifications") return false;
                return !(
                    Array.isArray(plugin) && plugin[0] === "expo-notifications"
                );
            }),
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
            ...(iosCapabilitiesEnabled
                ? []
                : [withoutPersonalTeamUnsupportedIosCapabilities]),
        ],
    };
};

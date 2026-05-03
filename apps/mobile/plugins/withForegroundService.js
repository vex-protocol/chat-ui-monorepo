const { withAndroidManifest } = require("expo/config-plugins");

// Expo config plugin that registers Notifee's ForegroundService inside
// AndroidManifest.xml so the user can opt in to a persistent WebSocket
// connection while backgrounded.
//
// Notifee ships the runtime (`app.notifee.core.ForegroundService`) but
// deliberately does NOT auto-declare it in its own manifest — declaring
// a foreground service obligates the app to provide a notification, and
// requires picking an Android 14+ `foregroundServiceType`. Both are
// per-app decisions, so Notifee makes the embedder add the entry.
//
// Type:
//   `dataSync` is the closest fit for a chat WebSocket. Android 14
//   added `FOREGROUND_SERVICE_DATA_SYNC` as the matching runtime
//   permission; `app.config.js` declares it alongside `FOREGROUND_SERVICE`.
//
// Note:
//   `expo-notifications`' own foreground-service hooks are not used —
//   that library is for displaying notifications, not for keeping the
//   JS engine alive. We rely on `@notifee/react-native` for both the
//   service lifecycle and the persistent notification.

const NOTIFEE_FGS = "app.notifee.core.ForegroundService";

module.exports = function withForegroundService(config) {
    return withAndroidManifest(config, (cfg) => {
        const application = cfg.modResults.manifest.application?.[0];
        if (!application) {
            return cfg;
        }
        application.service = application.service ?? [];
        const already = application.service.some(
            (svc) => svc?.$?.["android:name"] === NOTIFEE_FGS,
        );
        if (already) {
            return cfg;
        }
        application.service.push({
            $: {
                "android:name": NOTIFEE_FGS,
                "android:exported": "false",
                "android:foregroundServiceType": "dataSync",
                "android:stopWithTask": "false",
            },
        });
        return cfg;
    });
};

const {
    withAndroidManifest,
    withStringsXml,
} = require("expo/config-plugins");

// Expo config plugin that wires up Android Digital Asset Links so
// Google Credential Manager will accept this app as a valid relying
// party for one or more `https://<host>/.well-known/assetlinks.json`
// includes.
//
// On iOS the equivalent is `app.json`'s `ios.associatedDomains`
// (`webcredentials:<host>`). Android has no built-in Expo field for
// this, so without the plugin the OS will reject any WebAuthn
// ceremony with "RP ID can not be validated" before our code runs.
//
// What the plugin emits
// ─────────────────────
// 1. AndroidManifest.xml `<application>`:
//      <meta-data
//        android:name="asset_statements"
//        android:resource="@string/asset_statements" />
//
// 2. res/values/strings.xml:
//      <string name="asset_statements" translatable="false">
//          [{ \"include\": \"https://<host>/.well-known/assetlinks.json\" }]
//      </string>
//
// At runtime, Credential Manager parses the JSON, fetches the
// referenced `assetlinks.json` over HTTPS, and verifies the
// installed APK's package name + SHA-256 signing fingerprint match
// what the server published. The server side of this is configured
// by spire's `SPIRE_PASSKEY_ANDROID_PACKAGE` /
// `SPIRE_PASSKEY_ANDROID_FINGERPRINTS` env vars (or by self-hosting
// the JSON file).
//
// Usage (app.json):
//      "plugins": [
//          ...,
//          ["./plugins/withAndroidAssetStatements", { "hosts": ["api.vex.wtf"] }]
//      ]

const META_NAME = "asset_statements";
const STRING_RES_NAME = "asset_statements";

function buildIncludesValue(hosts) {
    return (
        "[" +
        hosts
            .map(
                (h) =>
                    `{ \\"include\\": \\"https://${h}/.well-known/assetlinks.json\\" }`,
            )
            .join(", ") +
        "]"
    );
}

function setOrReplaceString(strings, name, value) {
    if (!strings.resources) {
        strings.resources = {};
    }
    const list = Array.isArray(strings.resources.string)
        ? strings.resources.string
        : strings.resources.string
          ? [strings.resources.string]
          : [];
    const idx = list.findIndex((s) => s && s.$ && s.$.name === name);
    const node = {
        $: { name, translatable: "false" },
        _: value,
    };
    if (idx >= 0) {
        list[idx] = node;
    } else {
        list.push(node);
    }
    strings.resources.string = list;
    return strings;
}

function withAssetStatementsManifest(config) {
    return withAndroidManifest(config, (cfg) => {
        const application = cfg.modResults.manifest.application?.[0];
        if (!application) {
            return cfg;
        }
        application["meta-data"] = application["meta-data"] ?? [];
        const already = application["meta-data"].some(
            (md) => md?.$?.["android:name"] === META_NAME,
        );
        if (already) {
            return cfg;
        }
        application["meta-data"].push({
            $: {
                "android:name": META_NAME,
                "android:resource": `@string/${STRING_RES_NAME}`,
            },
        });
        return cfg;
    });
}

function withAssetStatementsString(config, hosts) {
    return withStringsXml(config, (cfg) => {
        cfg.modResults = setOrReplaceString(
            cfg.modResults,
            STRING_RES_NAME,
            buildIncludesValue(hosts),
        );
        return cfg;
    });
}

module.exports = function withAndroidAssetStatements(config, props) {
    const hosts = Array.isArray(props?.hosts)
        ? props.hosts.filter((h) => typeof h === "string" && h.length > 0)
        : [];
    if (hosts.length === 0) {
        return config;
    }
    config = withAssetStatementsManifest(config);
    config = withAssetStatementsString(config, hosts);
    return config;
};

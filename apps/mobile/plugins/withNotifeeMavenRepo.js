const { withProjectBuildGradle } = require("expo/config-plugins");

// Expo config plugin that registers Notifee's bundled local maven
// repo at the root project level so debug builds (which Expo runs
// with `--configure-on-demand`) don't fail to resolve
// `app.notifee:core:+`.
//
// Notifee 9.x ships its core AAR in `node_modules/@notifee/react-
// native/android/libs/` and registers that as a maven repo from
// inside its own `:notifee_react-native` build.gradle, via
// `rootProject.allprojects { repositories { maven { url ... } } }`.
//
// That works fine for release builds (which run plain `./gradlew
// assembleRelease`), but `expo run:android` invokes Gradle with
// `--configure-on-demand`, which makes Gradle skip configuring
// subprojects until they're strictly needed for task execution.
// `:app:processDebugResources` then resolves dependencies before
// `:notifee_react-native` is configured, the local maven repo
// hasn't been registered yet, and the build dies with:
//
//     Could not find any matches for app.notifee:core:+
//     as no versions of app.notifee:core are available.
//
// (`gradle.properties`'s `org.gradle.configureondemand=false` does
// not help because the CLI flag overrides the property.)
//
// The fix is to register the same local maven repo in the root
// `android/build.gradle`'s `allprojects { repositories { ... } }`
// block, which is evaluated at root configure time and is therefore
// always present before any subproject's resolution kicks in.
//
// Path resolution
// ───────────────
// The plugin walks up from `rootDir` (= `apps/mobile/android/`)
// looking for `node_modules/@notifee/react-native/android/libs`.
// That handles every layout we ship: bare `node_modules`, pnpm
// hoisted to the workspace root, and EAS Build (which runs from a
// fresh checkout). If the directory isn't found, the inserted
// snippet is a no-op — it doesn't break the build, it just won't
// fix it either, which surfaces the original `app.notifee:core:+`
// error as a clear diagnostic instead of an opaque path error.

const MARKER = "// notifee-local-libs (managed by withNotifeeMavenRepo)";

const SNIPPET = `        ${MARKER}
        def __notifeeLibs = null
        def __cur = rootDir.canonicalFile
        while (__cur != null) {
            def __candidate = new File(__cur, "node_modules/@notifee/react-native/android/libs")
            if (__candidate.exists()) {
                __notifeeLibs = __candidate
                break
            }
            __cur = __cur.parentFile
        }
        if (__notifeeLibs != null) {
            maven { url __notifeeLibs }
        }
`;

module.exports = function withNotifeeMavenRepo(config) {
    return withProjectBuildGradle(config, (cfg) => {
        if (cfg.modResults.contents.includes(MARKER)) {
            return cfg;
        }
        const replaced = cfg.modResults.contents.replace(
            /(allprojects\s*\{\s*repositories\s*\{)/,
            `$1\n${SNIPPET}`,
        );
        if (replaced === cfg.modResults.contents) {
            // No `allprojects { repositories {` block found; very
            // unusual for an Expo Android project. Append a fresh
            // block so the plugin still works as a fallback.
            cfg.modResults.contents = `${cfg.modResults.contents}

allprojects {
    repositories {
${SNIPPET}    }
}
`;
        } else {
            cfg.modResults.contents = replaced;
        }
        return cfg;
    });
};

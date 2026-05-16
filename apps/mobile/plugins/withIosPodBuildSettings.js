const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER_BEGIN = "    # @vex-ios-pod-build-settings-begin";
const MARKER_END = "    # @vex-ios-pod-build-settings-end";
const LEGACY_BEGIN = '    # Xcode 16\'s Swift "explicit modules" mode breaks';

const POD_BUILD_SETTINGS = `${MARKER_BEGIN}
    # Xcode 16's Swift explicit-module path can fail to expose
    # ExpoSQLite's bundled C sqlite symbols to Swift in Release builds.
    # Xcode 26 also needs C++17+ for React JSI's mutable std::string::data().
    # Keep the workaround scoped to the affected Expo pods.
    installer.pods_project.targets.each do |target|
      next unless ['ExpoSQLite', 'ExpoModulesCore', 'ExpoModulesJSI', 'React-jsi'].include?(target.name)

      target.build_configurations.each do |build_config|
        if ['ExpoSQLite', 'ExpoModulesCore'].include?(target.name)
          build_config.build_settings['SWIFT_VERSION'] = '5.0'
          build_config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
          build_config.build_settings['SWIFT_ENABLE_EXPLICIT_MODULES'] = 'NO'
          build_config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
        end
        if ['ExpoModulesJSI', 'React-jsi'].include?(target.name)
          build_config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++20'
        end
        if target.name == 'ExpoSQLite' && build_config.name == 'Release'
          build_config.build_settings['SWIFT_OPTIMIZATION_LEVEL'] = '-Onone'
        end
      end
    end
${MARKER_END}`;

function replaceMarkedBlock(contents) {
    const begin = contents.indexOf(MARKER_BEGIN);
    if (begin === -1) {
        return null;
    }

    const end = contents.indexOf(MARKER_END, begin);
    if (end === -1) {
        throw new Error(
            "Found Vex Podfile settings start marker without end marker",
        );
    }

    return (
        contents.slice(0, begin) +
        POD_BUILD_SETTINGS +
        contents.slice(end + MARKER_END.length)
    );
}

function replaceLegacyBlock(contents) {
    const begin = contents.indexOf(LEGACY_BEGIN);
    if (begin === -1) {
        return null;
    }

    const endToken = "    end\n";
    const end = contents.indexOf(endToken, begin);
    if (end === -1) {
        throw new Error("Found legacy Vex Podfile settings without closing end");
    }

    return (
        contents.slice(0, begin) +
        POD_BUILD_SETTINGS +
        contents.slice(end + endToken.length)
    );
}

function insertPodBuildSettings(contents) {
    const replaced = replaceMarkedBlock(contents);
    if (replaced) {
        return replaced;
    }

    const replacedLegacy = replaceLegacyBlock(contents);
    if (replacedLegacy) {
        return replacedLegacy;
    }

    const anchor = [
        "      :ccache_enabled => ccache_enabled?(podfile_properties),",
        "    )",
    ].join("\n");
    const index = contents.indexOf(anchor);
    if (index === -1) {
        throw new Error(
            "Unable to find react_native_post_install anchor in Podfile",
        );
    }

    const insertAt = index + anchor.length;
    return `${contents.slice(0, insertAt)}\n\n${POD_BUILD_SETTINGS}${contents.slice(
        insertAt,
    )}`;
}

module.exports = function withIosPodBuildSettings(config) {
    return withDangerousMod(config, [
        "ios",
        async (cfg) => {
            const podfilePath = path.join(
                cfg.modRequest.platformProjectRoot,
                "Podfile",
            );
            const contents = fs.readFileSync(podfilePath, "utf8");
            const nextContents = insertPodBuildSettings(contents);

            if (nextContents !== contents) {
                fs.writeFileSync(podfilePath, nextContents, "utf8");
            }

            return cfg;
        },
    ]);
};

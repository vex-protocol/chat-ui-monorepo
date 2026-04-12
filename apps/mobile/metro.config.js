const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, "node_modules"),
    path.resolve(monorepoRoot, "node_modules"),
];
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

// Stub Node-only modules that libvex@2.0.0 drags into the import graph.
//
// libvex's main index re-exports ./Client.js, which unconditionally
// imports ./storage/node.js, which imports better-sqlite3, which
// requires Node's "fs" module. React Native has no "fs", so Metro
// bundling dies with "Unable to resolve module fs" unless we stub the
// upstream require. apps/mobile uses expo-sqlite via kysely-expo for
// persistence — libvex's node storage backend is dead code on mobile.
//
// Instead of { type: "empty" } (which gives back an empty object and
// would crash cryptically if anything tried to `new` the constructor),
// resolve better-sqlite3 to a local stub that exports a real
// constructor which throws a loud, descriptive error if actually
// instantiated. That should never happen on mobile but gives us a
// clear signal if libvex ever changes behavior.
//
// Proper fix lives in libvex: either conditional `exports` with a
// "react-native" key pointing at a non-Node storage backend, or
// splitting storage into explicit submodules and not re-exporting
// them from the main index. Remove this stub when libvex ships either.
const betterSqlite3Stub = path.resolve(
    projectRoot,
    "src/lib/stubs/better-sqlite3.js",
);
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === "better-sqlite3") {
        return context.resolveRequest(context, betterSqlite3Stub, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

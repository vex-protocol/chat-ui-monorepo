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
// libvex's main index imports Client.js, which imports (at least):
//   - storage/node.js  → better-sqlite3  → "fs"
//   - utils/createLogger.js → winston → "os", "fs", "net", "tls", ...
//
// React Native has none of those Node builtins, so Metro dies at
// bundle time ("Unable to resolve module fs / os / ..."). Each entry
// below redirects a single top-level Node package to a local stub,
// short-circuiting the chain before Metro walks into Node-only code.
//
// Design choices:
//   - Stubs are real constructors / functions, not { type: "empty" },
//     so a surprise `new X()` at module load gives a clear error
//     instead of a cryptic "object is not a constructor" crash.
//   - Stubs are in src/lib/stubs/<name>.js so they're tree-shakeable
//     into the bundle with sensible file paths in stack traces.
//
// Adding another stub: create apps/mobile/src/lib/stubs/<name>.js,
// add the entry to nodeStubs below. Done.
//
// Proper fix lives in libvex itself (conditional exports or a
// platform-agnostic logger). Remove this block when libvex ships
// either.
const nodeStubs = {
    "better-sqlite3": path.resolve(
        projectRoot,
        "src/lib/stubs/better-sqlite3.js",
    ),
    winston: path.resolve(projectRoot, "src/lib/stubs/winston.js"),
};
config.resolver.resolveRequest = (context, moduleName, platform) => {
    const stub = nodeStubs[moduleName];
    if (stub !== undefined) {
        return context.resolveRequest(context, stub, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

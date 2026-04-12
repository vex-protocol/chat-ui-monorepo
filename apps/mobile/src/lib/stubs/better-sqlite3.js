// Stub better-sqlite3 for React Native.
//
// libvex@2.0.0's main index re-exports Client.js, which imports
// storage/node.js, which imports better-sqlite3. Metro walks that
// chain at bundle time and dies trying to resolve Node's "fs"
// module. apps/mobile uses expo-sqlite via kysely-expo for
// persistence — libvex's Node storage backend is dead code on
// mobile, so this stub satisfies the import graph without dragging
// better-sqlite3's native bindings into the APK.
//
// The stub is a constructor that throws loudly if anything actually
// tries to instantiate it. That should never happen on mobile — but
// if it does, the error message points at the right fix (use
// expo-sqlite + kysely-expo) rather than some cryptic "undefined is
// not a function" runtime crash.
//
// Wired up from apps/mobile/metro.config.js via config.resolver
//   .resolveRequest(...) — Metro redirects every import of
// "better-sqlite3" to this file at bundle time.
//
// Remove this stub (and the resolver entry) when libvex ships
// proper conditional exports for its storage backends.

module.exports = function BetterSqlite3Stub() {
    throw new Error(
        "better-sqlite3 is not available on React Native. " +
            "This stub exists to satisfy libvex's import graph. " +
            "Use expo-sqlite via kysely-expo instead.",
    );
};
module.exports.default = module.exports;

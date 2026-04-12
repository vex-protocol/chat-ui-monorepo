// Stub Kysely's FileMigrationProvider for React Native.
//
// Kysely's FileMigrationProvider uses `yield import(runtime-path)` to
// load migration files from disk. Hermes's bytecode compiler rejects
// that syntax ("Invalid expression encountered") in both ESM and CJS
// builds — the dynamic import is preserved in Kysely's compiled output
// regardless of which export condition Metro uses (conditionNames
// doesn't help; CJS import() is valid in Node 14+ so the compiler
// doesn't transform it to require()).
//
// Mobile never instantiates FileMigrationProvider — it's dead code
// pulled in because Kysely's main index re-exports everything. This
// stub satisfies the re-export so module load completes, and throws
// loudly if something ever tries to use it.

function FileMigrationProviderStub() {
    throw new Error(
        "Kysely's FileMigrationProvider is not available on React Native. " +
            "This stub exists to satisfy the import graph. " +
            "Use kysely-expo's Expo SQLite provider instead.",
    );
}

module.exports = {
    FileMigrationProvider: FileMigrationProviderStub,
};
module.exports.default = module.exports;

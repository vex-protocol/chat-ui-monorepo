#!/usr/bin/env node
// Compare two Expo fingerprint JSON files and output "build" or "ota".
//
// Only reports "build" when the diff touches sources tagged with a
// reason in REBUILD_REASONS — i.e. a change to native autolinking or
// bare RN state. A change to a file hash that doesn't carry one of
// those reasons (formatting tweaks, pod reshuffles, comment edits)
// stays on the OTA path.
//
// Mirrors Bluesky's fingerprint-native action behavior without pulling
// @expo/fingerprint as a runtime dep — this script operates on the
// raw JSON produced by `npx @expo/fingerprint .` and implements the
// source-level diff itself.
//
// Usage:
//   node scripts/fingerprint-diff.mjs <current.json> [<prev.json>]
//
// Exit codes:
//   0  — printed "build" or "ota" on stdout
//   2  — bad arguments
//
// On any failure reading the prev file, prints "build" and exits 0 —
// fail-safe toward rebuilding rather than shipping a broken OTA.

import { readFileSync } from "node:fs";

// Any reason in this set forces a rebuild because it can land native code
// or native config that OTA can't ship. Anything NOT here (formatting,
// pod reshuffles, metadata tweaks) is treated as OTA-safe.
//
// Earlier revisions of this list only contained the `*Autolinking` keys,
// copied from Bluesky's social-app. That under-counted — `expoConfigPlugins`
// and `rncoreAutolinking*` also legitimately bump the EAS fingerprint
// (and therefore the runtime version), so an OTA published under those
// conditions would land a new runtimeVersion that no installed APK
// matches → silent "update missing" bug.
const REBUILD_REASONS = new Set([
    "bareRncliAutolinking",
    "expoAutolinkingAndroid",
    "expoAutolinkingIos",
    "expoConfigPlugins",
    "rncoreAutolinkingAndroid",
    "rncoreAutolinkingIos",
]);

const [, , currentPath, prevPath] = process.argv;

if (!currentPath) {
    console.error("usage: fingerprint-diff.mjs <current.json> [<prev.json>]");
    process.exit(2);
}

let current;
try {
    current = JSON.parse(readFileSync(currentPath, "utf8"));
} catch (err) {
    console.error(
        `Could not read current fingerprint at ${currentPath}: ${err.message}`,
    );
    process.exit(2);
}

if (!prevPath) {
    console.error("No previous fingerprint provided — will build");
    console.log("build");
    process.exit(0);
}

let prev;
try {
    prev = JSON.parse(readFileSync(prevPath, "utf8"));
} catch (err) {
    console.error(
        `Could not read prev fingerprint at ${prevPath}: ${err.message}`,
    );
    console.log("build");
    process.exit(0);
}

// Index prev sources by a stable id so we can detect adds / removes /
// modifications in one pass through current.sources.
const prevById = new Map();
for (const src of prev.sources ?? []) {
    prevById.set(sourceId(src), src);
}

const changedReasons = new Set();

for (const src of current.sources ?? []) {
    const id = sourceId(src);
    const prevSrc = prevById.get(id);
    prevById.delete(id);
    if (!prevSrc) {
        // Added in current
        addReasons(changedReasons, src);
    } else if (prevSrc.hash !== src.hash) {
        // Modified — collect reasons from both sides
        addReasons(changedReasons, src);
        addReasons(changedReasons, prevSrc);
    }
}
// Anything left in prevById is a removal
for (const [, src] of prevById) {
    addReasons(changedReasons, src);
}

const relevant = [...changedReasons].filter((r) => REBUILD_REASONS.has(r));

console.error(
    `All changed reasons: ${[...changedReasons].join(", ") || "(none)"}`,
);
console.error(`Relevant rebuild reasons: ${relevant.join(", ") || "(none)"}`);

console.log(relevant.length > 0 ? "build" : "ota");

function addReasons(set, src) {
    if (Array.isArray(src.reasons)) {
        for (const r of src.reasons) set.add(r);
    }
}

function sourceId(src) {
    // Fingerprint sources have one of { filePath, contents, dir } as
    // the stable identity field. Type is always present.
    if (src.filePath) return `${src.type}:${src.filePath}`;
    if (src.dir) return `${src.type}:${src.dir}`;
    if (src.contents)
        return `${src.type}:contents:${src.contents.slice(0, 128)}`;
    return `${src.type}:${JSON.stringify(src).slice(0, 128)}`;
}

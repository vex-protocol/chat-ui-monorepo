#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";

const PACKAGES_ENV = process.env.PACKAGES_JSON;
const pinnedCatalogVersions = new Map([["@vex-chat/libvex", "6.6.4"]]);

if (!PACKAGES_ENV) {
    console.error("PACKAGES_JSON is required.");
    process.exit(1);
}

let publishedPackages;
try {
    publishedPackages = JSON.parse(PACKAGES_ENV);
} catch (error) {
    console.error("PACKAGES_JSON is not valid JSON.");
    process.exit(1);
}

if (!Array.isArray(publishedPackages) || publishedPackages.length === 0) {
    console.log("No published packages in payload; nothing to update.");
    process.exit(0);
}

const publishedByName = new Map();
for (const entry of publishedPackages) {
    if (
        entry &&
        typeof entry.name === "string" &&
        typeof entry.version === "string" &&
        entry.name.startsWith("@vex-chat/")
    ) {
        publishedByName.set(entry.name, entry.version);
    }
}

if (publishedByName.size === 0) {
    console.log("No @vex-chat/* packages in payload; nothing to update.");
    process.exit(0);
}

const workspacePath = new URL("../pnpm-workspace.yaml", import.meta.url);
const workspace = readFileSync(workspacePath, "utf8");

let nextWorkspace = workspace;
const updated = [];
const skipped = [];

for (const [name, version] of publishedByName) {
    const pinnedVersion = pinnedCatalogVersions.get(name);
    const nextVersion = pinnedVersion ?? version;

    if (pinnedVersion && version !== pinnedVersion) {
        skipped.push(`${name}: ${version} ignored; pinned to ${pinnedVersion}`);
    }

    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const linePattern = new RegExp(
        `^(\\s*"${escapedName}"\\s*:\\s*)([^\\n#]+)`,
        "m",
    );
    const match = nextWorkspace.match(linePattern);

    if (!match) {
        continue;
    }

    const currentVersion = match[2].trim();
    if (currentVersion === nextVersion) {
        continue;
    }

    nextWorkspace = nextWorkspace.replace(linePattern, `$1${nextVersion}`);
    updated.push(`${name}: ${currentVersion} -> ${nextVersion}`);
}

if (updated.length === 0) {
    for (const line of skipped) {
        console.log(`- ${line}`);
    }
    console.log("Catalog already up to date for published packages.");
    process.exit(0);
}

writeFileSync(workspacePath, nextWorkspace, "utf8");
console.log("Updated catalog versions:");
for (const line of updated) {
    console.log(`- ${line}`);
}
for (const line of skipped) {
    console.log(`- ${line}`);
}

#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";

const PACKAGES_ENV = process.env.PACKAGES_JSON;

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

for (const [name, version] of publishedByName) {
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
    if (currentVersion === version) {
        continue;
    }

    nextWorkspace = nextWorkspace.replace(linePattern, `$1${version}`);
    updated.push(`${name}: ${currentVersion} -> ${version}`);
}

if (updated.length === 0) {
    console.log("Catalog already up to date for published packages.");
    process.exit(0);
}

writeFileSync(workspacePath, nextWorkspace, "utf8");
console.log("Updated catalog versions:");
for (const line of updated) {
    console.log(`- ${line}`);
}

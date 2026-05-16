/**
 * Copyright (c) 2020-2026 Vex Heavy Industries LLC
 * Licensed under AGPL-3.0. See LICENSE for details.
 * Commercial licenses available at vex.wtf
 */

import { argv, exit } from "node:process";

const urls = argv.slice(2);
const timeoutMs = 60_000;
const pollMs = 500;
const startedAt = Date.now();

if (urls.length === 0) {
    throw new Error("Pass at least one URL to wait for.");
}

while (Date.now() - startedAt < timeoutMs) {
    const ready = await Promise.all(urls.map(isReady));
    if (ready.every(Boolean)) {
        exit(0);
    }
    await sleep(pollMs);
}

throw new Error(`Timed out waiting for: ${urls.join(", ")}`);

async function isReady(url: string): Promise<boolean> {
    try {
        const response = await fetch(url);
        return response.status >= 200 && response.status < 500;
    } catch {
        return false;
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

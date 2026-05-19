import type { LinkPreviewMetadata } from "@vex-chat/store";

import {
    extractLinkPreviewUrl,
    fetchLinkPreviewMetadata,
} from "@vex-chat/store";

const LINK_PREVIEW_HTML_LIMIT = 512 * 1024;
const LINK_PREVIEW_TIMEOUT_MS = 8_000;

const previewCache = new Map<string, Promise<LinkPreviewMetadata | null>>();

export function loadLinkPreviewForContent(
    content: string,
): Promise<LinkPreviewMetadata | null> {
    const url = extractLinkPreviewUrl(content);
    if (!url) {
        return Promise.resolve(null);
    }

    let cached = previewCache.get(url);
    if (!cached) {
        cached = fetchLinkPreviewMetadata(url, fetchHtml).catch(() => null);
        previewCache.set(url, cached);
    }
    return cached;
}

async function fetchHtml(url: string): Promise<{ finalUrl?: string; html: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
        controller.abort();
    }, LINK_PREVIEW_TIMEOUT_MS);

    try {
        const response = await globalThis.fetch(url, {
            headers: { Accept: "text/html,application/xhtml+xml" },
            signal: controller.signal,
        });
        const contentType = (
            response.headers.get("content-type") ?? ""
        ).toLowerCase();
        if (
            !response.ok ||
            (contentType &&
                !contentType.includes("text/html") &&
                !contentType.includes("application/xhtml+xml"))
        ) {
            return { html: "" };
        }

        const html = (await response.text()).slice(0, LINK_PREVIEW_HTML_LIMIT);
        return response.url ? { finalUrl: response.url, html } : { html };
    } finally {
        clearTimeout(timeout);
    }
}

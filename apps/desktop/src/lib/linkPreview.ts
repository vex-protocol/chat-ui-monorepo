import type { LinkPreviewMetadata } from "@vex-chat/store";

import {
    extractLinkPreviewUrl,
    fetchLinkPreviewMetadata,
} from "@vex-chat/store";

import { invoke } from "@tauri-apps/api/core";

interface NativeLinkPreviewHtml {
    finalUrl?: string;
    html: string;
}

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
        cached = fetchLinkPreviewMetadata(url, fetchHtml).catch(() => {
            previewCache.delete(url);
            return null;
        });
        previewCache.set(url, cached);
    }
    return cached;
}

async function fetchHtml(url: string): Promise<NativeLinkPreviewHtml> {
    return invoke<NativeLinkPreviewHtml>("fetch_link_preview_html", { url });
}

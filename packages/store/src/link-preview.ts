export type LinkPreviewHtmlFetcher = (
    url: string,
) => Promise<LinkPreviewHtmlResult>;

export interface LinkPreviewHtmlResult {
    finalUrl?: string;
    html: string;
}

export interface LinkPreviewMetadata {
    description?: string;
    faviconUrl?: string;
    imageUrl?: string;
    siteName?: string;
    title: string;
    url: string;
}

const MAX_URL_LENGTH = 2048;
const META_TAG_RE = /<meta\s+[^>]*>/gi;
const LINK_TAG_RE = /<link\s+[^>]*>/gi;
const TITLE_RE = /<title[^>]*>([\s\S]*?)<\/title>/i;
const MARKDOWN_LINK_RE = /!?\[[^\]\n]*\]\((https?:\/\/[^\s)]+)\)/gi;
const BARE_URL_RE = /https?:\/\/[^\s<>()\[\]{}"']+/gi;

export function extractLinkPreviewUrl(content: string): null | string {
    const previewContent = stripCodeFences(content);
    for (const match of previewContent.matchAll(MARKDOWN_LINK_RE)) {
        const fullMatch = match[0] ?? "";
        if (fullMatch.startsWith("!")) {
            continue;
        }
        const normalized = normalizeLinkPreviewUrl(match[1]);
        if (normalized) {
            return normalized;
        }
    }

    const bareUrlSource = previewContent.replace(
        /!\[[^\]\n]*\]\(https?:\/\/[^\s)]+\)/gi,
        "",
    );
    for (const match of bareUrlSource.matchAll(BARE_URL_RE)) {
        const normalized = normalizeLinkPreviewUrl(match[0]);
        if (normalized) {
            return normalized;
        }
    }

    return null;
}

export async function fetchLinkPreviewMetadata(
    url: string,
    fetchHtml: LinkPreviewHtmlFetcher,
): Promise<LinkPreviewMetadata | null> {
    const normalized = normalizeLinkPreviewUrl(url);
    if (!normalized) {
        return null;
    }

    const result = await fetchHtml(normalized);
    return parseLinkPreviewHtml(result.html, result.finalUrl ?? normalized);
}

export function normalizeLinkPreviewUrl(value: unknown): null | string {
    if (typeof value !== "string") {
        return null;
    }
    const trimmed = trimUrlPunctuation(value.trim());
    if (!trimmed || trimmed.length > MAX_URL_LENGTH) {
        return null;
    }

    try {
        const url = new URL(trimmed);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
            return null;
        }
        url.hash = "";
        return url.toString();
    } catch {
        return null;
    }
}

export function parseLinkPreviewHtml(
    html: string,
    pageUrl: string,
): LinkPreviewMetadata | null {
    const normalizedPageUrl = normalizeLinkPreviewUrl(pageUrl);
    if (!normalizedPageUrl) {
        return null;
    }

    const meta = collectMeta(html);
    const explicitTitle = firstText(meta, [
        "og:title",
        "twitter:title",
        "title",
    ]);
    const documentTitle = cleanupText(TITLE_RE.exec(html)?.[1]);
    const title = explicitTitle ?? documentTitle;
    const description = firstText(meta, [
        "og:description",
        "twitter:description",
        "description",
    ]);
    const imageUrl = firstUrl(
        meta,
        [
            "og:image:secure_url",
            "og:image:url",
            "og:image",
            "twitter:image:src",
            "twitter:image",
        ],
        normalizedPageUrl,
    );
    const faviconUrl = findFavicon(html, normalizedPageUrl);
    const siteName =
        firstText(meta, ["og:site_name", "application-name"]) ??
        hostnameForUrl(normalizedPageUrl);

    if (!title && !description && !imageUrl) {
        return null;
    }

    return {
        ...(description ? { description } : {}),
        ...(faviconUrl ? { faviconUrl } : {}),
        ...(imageUrl ? { imageUrl } : {}),
        ...(siteName ? { siteName } : {}),
        title: title ?? siteName ?? hostnameForUrl(normalizedPageUrl),
        url: normalizedPageUrl,
    };
}

function cleanupText(value: string | undefined): string | undefined {
    if (!value) {
        return undefined;
    }
    const cleaned = decodeHtmlEntities(stripTags(value))
        .replace(/\s+/g, " ")
        .trim();
    return cleaned || undefined;
}

function collectMeta(html: string): Map<string, string> {
    const meta = new Map<string, string>();
    for (const match of html.matchAll(META_TAG_RE)) {
        const attrs = parseHtmlAttributes(match[0] ?? "");
        const key = (
            attrs.get("property") ??
            attrs.get("name") ??
            attrs.get("itemprop") ??
            ""
        ).toLowerCase();
        const content = cleanupText(attrs.get("content"));
        if (key && content && !meta.has(key)) {
            meta.set(key, content);
        }
    }
    return meta;
}

function decodeHtmlEntities(value: string): string {
    return value.replace(
        /&(#x?[0-9a-f]+|[a-z]+);/gi,
        (entity, raw: string): string => {
            const lower = raw.toLowerCase();
            if (lower.startsWith("#x")) {
                const code = Number.parseInt(lower.slice(2), 16);
                return isValidCodePoint(code)
                    ? String.fromCodePoint(code)
                    : entity;
            }
            if (lower.startsWith("#")) {
                const code = Number.parseInt(lower.slice(1), 10);
                return isValidCodePoint(code)
                    ? String.fromCodePoint(code)
                    : entity;
            }
            switch (lower) {
                case "amp":
                    return "&";
                case "apos":
                    return "'";
                case "gt":
                    return ">";
                case "lt":
                    return "<";
                case "nbsp":
                    return " ";
                case "quot":
                    return '"';
                default:
                    return entity;
            }
        },
    );
}

function findFavicon(html: string, pageUrl: string): string | undefined {
    for (const match of html.matchAll(LINK_TAG_RE)) {
        const attrs = parseHtmlAttributes(match[0] ?? "");
        const rel = attrs.get("rel")?.toLowerCase() ?? "";
        if (
            !rel
                .split(/\s+/)
                .some((part) => part === "icon" || part === "apple-touch-icon")
        ) {
            continue;
        }
        const href = attrs.get("href");
        const resolved = resolveHttpUrl(href, pageUrl);
        if (resolved) {
            return resolved;
        }
    }
    return undefined;
}

function firstText(
    meta: Map<string, string>,
    keys: string[],
): string | undefined {
    for (const key of keys) {
        const value = cleanupText(meta.get(key));
        if (value) {
            return value;
        }
    }
    return undefined;
}

function firstUrl(
    meta: Map<string, string>,
    keys: string[],
    baseUrl: string,
): string | undefined {
    for (const key of keys) {
        const resolved = resolveHttpUrl(meta.get(key), baseUrl);
        if (resolved) {
            return resolved;
        }
    }
    return undefined;
}

function hasBalancedParens(value: string): boolean {
    let balance = 0;
    for (const char of value) {
        if (char === "(") {
            balance++;
        } else if (char === ")") {
            balance--;
        }
    }
    return balance === 0;
}

function hostnameForUrl(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./i, "");
    } catch {
        return "";
    }
}

function isValidCodePoint(value: number): boolean {
    return Number.isInteger(value) && value >= 0 && value <= 0x10ffff;
}

function parseHtmlAttributes(tag: string): Map<string, string> {
    const attrs = new Map<string, string>();
    const attrRe =
        /([^\s"'<>/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
    for (const match of tag.matchAll(attrRe)) {
        const name = match[1]?.toLowerCase();
        if (!name) {
            continue;
        }
        attrs.set(name, match[2] ?? match[3] ?? match[4] ?? "");
    }
    return attrs;
}

function resolveHttpUrl(
    value: string | undefined,
    baseUrl: string,
): string | undefined {
    if (!value) {
        return undefined;
    }
    try {
        const url = new URL(decodeHtmlEntities(value.trim()), baseUrl);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
            return undefined;
        }
        return url.toString();
    } catch {
        return undefined;
    }
}

function stripCodeFences(value: string): string {
    return value.replace(/```[\s\S]*?(?:```|$)/g, " ");
}

function stripTags(value: string): string {
    return value.replace(/<[^>]+>/g, "");
}

function trimUrlPunctuation(value: string): string {
    let next = value;
    while (/[),.!?;:]$/.test(next)) {
        const last = next.at(-1);
        if (last === ")" && hasBalancedParens(next)) {
            break;
        }
        next = next.slice(0, -1);
    }
    return next;
}

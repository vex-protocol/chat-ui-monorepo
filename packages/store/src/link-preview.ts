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

export function extractLinkPreviewUrl(content: string): null | string {
    const previewContent = stripCodeFences(content);

    let markdownCursor = 0;
    while (markdownCursor < previewContent.length) {
        const match = findNextMarkdownLink(previewContent, markdownCursor);
        if (!match) {
            break;
        }
        markdownCursor = match.end;
        if (match.image) {
            continue;
        }
        const normalized = normalizeLinkPreviewUrl(match.url);
        if (normalized) {
            return normalized;
        }
    }

    const bareUrlSource = maskMarkdownLinks(previewContent);
    let bareCursor = 0;
    while (bareCursor < bareUrlSource.length) {
        const match = findNextBareUrl(bareUrlSource, bareCursor);
        if (!match) {
            break;
        }
        bareCursor = match.end;
        const normalized = normalizeLinkPreviewUrl(match.url);
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
        if (isUnsafePreviewHostname(url.hostname)) {
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
    const documentTitle = cleanupText(findTitleText(html));
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
    const cleaned = collapseWhitespace(stripTags(decodeHtmlEntities(value)));
    return cleaned || undefined;
}

function collapseWhitespace(value: string): string {
    let output = "";
    let lastWasWhitespace = false;
    for (const char of value.trim()) {
        if (isWhitespace(char)) {
            if (!lastWasWhitespace) {
                output += " ";
            }
            lastWasWhitespace = true;
            continue;
        }
        output += char;
        lastWasWhitespace = false;
    }
    return output;
}

function collectMeta(html: string): Map<string, string> {
    const meta = new Map<string, string>();
    for (const tag of findHtmlTags(html, "meta")) {
        const attrs = parseHtmlAttributes(tag);
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
    let output = "";
    let cursor = 0;
    while (cursor < value.length) {
        const amp = value.indexOf("&", cursor);
        if (amp === -1) {
            output += value.slice(cursor);
            break;
        }
        output += value.slice(cursor, amp);
        const semi = value.indexOf(";", amp + 1);
        if (semi === -1 || semi - amp > 32) {
            output += "&";
            cursor = amp + 1;
            continue;
        }
        const raw = value.slice(amp + 1, semi);
        output += decodeHtmlEntity(raw) ?? `&${raw};`;
        cursor = semi + 1;
    }
    return output;
}

function decodeHtmlEntity(raw: string): string | undefined {
    const lower = raw.toLowerCase();
    if (lower.startsWith("#x")) {
        const code = Number.parseInt(lower.slice(2), 16);
        return isValidCodePoint(code) ? String.fromCodePoint(code) : undefined;
    }
    if (lower.startsWith("#")) {
        const code = Number.parseInt(lower.slice(1), 10);
        return isValidCodePoint(code) ? String.fromCodePoint(code) : undefined;
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
            return undefined;
    }
}

function earliestIndex(a: number, b: number): number {
    if (a === -1) {
        return b;
    }
    if (b === -1) {
        return a;
    }
    return Math.min(a, b);
}

function endsWithUrlPunctuation(value: string): boolean {
    const last = value.at(-1);
    return (
        last === ")" ||
        last === "," ||
        last === "." ||
        last === "!" ||
        last === "?" ||
        last === ";" ||
        last === ":"
    );
}

function findAttributeNameEnd(source: string, start: number): number {
    let cursor = start;
    while (cursor < source.length) {
        const char = source[cursor] ?? "";
        if (
            !char ||
            isWhitespace(char) ||
            char === "'" ||
            char === '"' ||
            char === "<" ||
            char === ">" ||
            char === "/" ||
            char === "="
        ) {
            break;
        }
        cursor++;
    }
    return cursor;
}

function findFavicon(html: string, pageUrl: string): string | undefined {
    for (const tag of findHtmlTags(html, "link")) {
        const attrs = parseHtmlAttributes(tag);
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

function findHtmlTags(source: string, tagName: string): string[] {
    const tags: string[] = [];
    const lower = source.toLowerCase();
    const needle = `<${tagName.toLowerCase()}`;
    let cursor = 0;
    while (cursor < source.length) {
        const start = lower.indexOf(needle, cursor);
        if (start === -1) {
            break;
        }
        const afterName = start + needle.length;
        if (!isTagNameBoundary(source[afterName] ?? "")) {
            cursor = afterName;
            continue;
        }
        const end = findTagEnd(source, afterName);
        if (end === -1) {
            break;
        }
        tags.push(source.slice(start, end + 1));
        cursor = end + 1;
    }
    return tags;
}

function findMarkdownLabelEnd(source: string, start: number): number {
    let escaped = false;
    for (let index = start; index < source.length; index++) {
        const char = source[index];
        if (char === "\n") {
            return -1;
        }
        if (escaped) {
            escaped = false;
            continue;
        }
        if (char === "\\") {
            escaped = true;
            continue;
        }
        if (char === "]") {
            return index;
        }
    }
    return -1;
}

function findMarkdownLinkEnd(source: string, start: number): number {
    let depth = 0;
    for (let index = start; index < source.length; index++) {
        const char = source[index];
        if (char === "\n") {
            return -1;
        }
        if (char === "(") {
            depth++;
            continue;
        }
        if (char === ")") {
            if (depth === 0) {
                return index;
            }
            depth--;
        }
    }
    return -1;
}

function findNextBareUrl(
    source: string,
    start: number,
): null | { end: number; url: string } {
    let searchStart = start;
    while (searchStart < source.length) {
        const httpIndex = source.indexOf("http://", searchStart);
        const httpsIndex = source.indexOf("https://", searchStart);
        const index = earliestIndex(httpIndex, httpsIndex);
        if (index === -1) {
            return null;
        }
        const previous = source[index - 1];
        if (previous && isUrlBodyChar(previous)) {
            searchStart = index + 1;
            continue;
        }

        let end = index;
        while (end < source.length && !isBareUrlTerminator(source[end] ?? "")) {
            end++;
        }
        const url = trimUrlPunctuation(source.slice(index, end));
        if (!url) {
            searchStart = end + 1;
            continue;
        }
        return { end: index + url.length, url };
    }
    return null;
}

function findNextMarkdownLink(
    source: string,
    start: number,
): null | { end: number; image: boolean; start: number; url: string } {
    let index = start;
    while (index < source.length) {
        const char = source[index];
        const image = char === "!" && source[index + 1] === "[";
        const open = image ? index + 1 : char === "[" ? index : -1;
        if (open === -1) {
            index++;
            continue;
        }

        const labelEnd = findMarkdownLabelEnd(source, open + 1);
        if (labelEnd === -1) {
            index = open + 1;
            continue;
        }
        if (source[labelEnd + 1] !== "(") {
            index = labelEnd + 1;
            continue;
        }

        const urlStart = labelEnd + 2;
        const urlEnd = findMarkdownLinkEnd(source, urlStart);
        if (urlEnd === -1) {
            index = urlStart;
            continue;
        }

        return {
            end: urlEnd + 1,
            image,
            start: image ? index : open,
            url: source.slice(urlStart, urlEnd).trim(),
        };
    }
    return null;
}

function findTagEnd(source: string, start: number): number {
    let quote: null | string = null;
    for (let index = start; index < source.length; index++) {
        const char = source[index];
        if (quote) {
            if (char === quote) {
                quote = null;
            }
            continue;
        }
        if (char === '"' || char === "'") {
            quote = char;
            continue;
        }
        if (char === ">") {
            return index;
        }
    }
    return -1;
}

function findTitleText(html: string): string | undefined {
    const lower = html.toLowerCase();
    let cursor = 0;
    while (cursor < html.length) {
        const open = lower.indexOf("<title", cursor);
        if (open === -1) {
            return undefined;
        }
        const afterName = open + "<title".length;
        if (!isTagNameBoundary(html[afterName] ?? "")) {
            cursor = afterName;
            continue;
        }
        const contentStart = findTagEnd(html, afterName);
        if (contentStart === -1) {
            return undefined;
        }
        const close = lower.indexOf("</title", contentStart + 1);
        if (close === -1) {
            return html.slice(contentStart + 1);
        }
        return html.slice(contentStart + 1, close);
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
        return stripLeadingWww(new URL(url).hostname);
    } catch {
        return "";
    }
}

function isAsciiAlphaNumeric(char: string): boolean {
    const code = char.charCodeAt(0);
    return (
        (code >= 48 && code <= 57) ||
        (code >= 65 && code <= 90) ||
        (code >= 97 && code <= 122)
    );
}

function isBareUrlTerminator(char: string): boolean {
    return (
        char === "" ||
        isWhitespace(char) ||
        char === "<" ||
        char === ">" ||
        char === "[" ||
        char === "]" ||
        char === "{" ||
        char === "}" ||
        char === '"' ||
        char === "'"
    );
}

function isHexChar(char: string): boolean {
    const code = char.charCodeAt(0);
    return (
        (code >= 48 && code <= 57) ||
        (code >= 65 && code <= 70) ||
        (code >= 97 && code <= 102)
    );
}

function isLinkLocalIPv6(hostname: string): boolean {
    const firstWord = parseFirstIPv6Word(hostname);
    return Number.isInteger(firstWord) && (firstWord & 0xffc0) === 0xfe80;
}

function isPrivateIPv4(hostname: string): boolean {
    const parts = hostname.split(".");
    if (parts.length !== 4) {
        return false;
    }
    const octets = parts.map(parseIPv4Octet);
    if (
        octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
    ) {
        return false;
    }
    const [a = 0, b = 0] = octets;
    return (
        a === 0 ||
        a === 10 ||
        a === 127 ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168)
    );
}

function isPrivateIPv4MappedIPv6(hostname: string): boolean {
    const prefix = "::ffff:";
    if (!hostname.startsWith(prefix)) {
        return false;
    }
    const suffix = hostname.slice(prefix.length);
    if (suffix.includes(".")) {
        return isPrivateIPv4(suffix);
    }
    const parts = suffix.split(":");
    if (parts.length !== 2) {
        return false;
    }
    const high = parseIPv6Word(parts[0] ?? "");
    const low = parseIPv6Word(parts[1] ?? "");
    if (!Number.isInteger(high) || !Number.isInteger(low)) {
        return false;
    }
    return isPrivateIPv4(
        [(high >> 8) & 0xff, high & 0xff, (low >> 8) & 0xff, low & 0xff].join(
            ".",
        ),
    );
}

function isTagNameBoundary(char: string): boolean {
    return char === "" || isWhitespace(char) || char === "/" || char === ">";
}

function isUniqueLocalIPv6(hostname: string): boolean {
    const firstWord = parseFirstIPv6Word(hostname);
    return Number.isInteger(firstWord) && (firstWord & 0xfe00) === 0xfc00;
}

function isUnsafePreviewHostname(hostname: string): boolean {
    const normalized = stripTrailingDot(
        stripIpv6Brackets(hostname),
    ).toLowerCase();
    if (
        normalized === "localhost" ||
        normalized.endsWith(".localhost") ||
        normalized.endsWith(".local")
    ) {
        return true;
    }
    if (isPrivateIPv4(normalized)) {
        return true;
    }
    if (isPrivateIPv4MappedIPv6(normalized)) {
        return true;
    }
    if (
        normalized === "::1" ||
        isLinkLocalIPv6(normalized) ||
        isUniqueLocalIPv6(normalized)
    ) {
        return true;
    }
    return false;
}

function isUrlBodyChar(char: string): boolean {
    return (
        isAsciiAlphaNumeric(char) ||
        char === "@" ||
        char === "." ||
        char === "_" ||
        char === "~" ||
        char === ":" ||
        char === "/" ||
        char === "?" ||
        char === "#" ||
        char === "[" ||
        char === "]" ||
        char === "!" ||
        char === "$" ||
        char === "&" ||
        char === "'" ||
        char === "(" ||
        char === ")" ||
        char === "*" ||
        char === "+" ||
        char === "," ||
        char === ";" ||
        char === "=" ||
        char === "%" ||
        char === "-"
    );
}

function isValidCodePoint(value: number): boolean {
    return Number.isInteger(value) && value >= 0 && value <= 0x10ffff;
}

function isWhitespace(char: string): boolean {
    return (
        char === " " ||
        char === "\n" ||
        char === "\r" ||
        char === "\t" ||
        char === "\f"
    );
}

function maskMarkdownLinks(value: string): string {
    let result = "";
    let cursor = 0;
    while (cursor < value.length) {
        const match = findNextMarkdownLink(value, cursor);
        if (!match) {
            result += value.slice(cursor);
            break;
        }
        result += value.slice(cursor, match.start);
        result += spacesPreservingNewlines(value.slice(match.start, match.end));
        cursor = match.end;
    }
    return result;
}

function parseFirstIPv6Word(value: string): number {
    const separator = value.indexOf(":");
    if (separator <= 0) {
        return Number.NaN;
    }
    return parseIPv6Word(value.slice(0, separator));
}

function parseHtmlAttributes(tag: string): Map<string, string> {
    const attrs = new Map<string, string>();
    const tagNameEnd = findAttributeNameEnd(tag, 1);
    let cursor = tagNameEnd;
    while (cursor < tag.length) {
        while (cursor < tag.length && isWhitespace(tag[cursor] ?? "")) {
            cursor++;
        }
        const char = tag[cursor];
        if (!char || char === "/" || char === ">") {
            break;
        }
        const nameEnd = findAttributeNameEnd(tag, cursor);
        const name = tag.slice(cursor, nameEnd).toLowerCase();
        cursor = nameEnd;
        while (cursor < tag.length && isWhitespace(tag[cursor] ?? "")) {
            cursor++;
        }
        let value = "";
        if (tag[cursor] === "=") {
            cursor++;
            while (cursor < tag.length && isWhitespace(tag[cursor] ?? "")) {
                cursor++;
            }
            const quote = tag[cursor];
            if (quote === '"' || quote === "'") {
                const valueStart = cursor + 1;
                const valueEnd = tag.indexOf(quote, valueStart);
                if (valueEnd === -1) {
                    value = tag.slice(valueStart);
                    cursor = tag.length;
                } else {
                    value = tag.slice(valueStart, valueEnd);
                    cursor = valueEnd + 1;
                }
            } else {
                const valueStart = cursor;
                while (
                    cursor < tag.length &&
                    !isWhitespace(tag[cursor] ?? "") &&
                    tag[cursor] !== ">"
                ) {
                    cursor++;
                }
                value = tag.slice(valueStart, cursor);
            }
        }
        if (name) {
            attrs.set(name, value);
        }
    }
    return attrs;
}

function parseIPv4Octet(value: string): number {
    if (value.length === 0 || value.length > 3) {
        return Number.NaN;
    }
    let octet = 0;
    for (const char of value) {
        const code = char.charCodeAt(0);
        if (code < 48 || code > 57) {
            return Number.NaN;
        }
        octet = octet * 10 + (code - 48);
    }
    return octet;
}

function parseIPv6Word(value: string): number {
    if (value.length === 0 || value.length > 4) {
        return Number.NaN;
    }
    for (const char of value) {
        if (!isHexChar(char)) {
            return Number.NaN;
        }
    }
    return Number.parseInt(value, 16);
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
        return normalizeLinkPreviewUrl(url.toString()) ?? undefined;
    } catch {
        return undefined;
    }
}

function spacesPreservingNewlines(value: string): string {
    let output = "";
    for (const char of value) {
        output += char === "\n" ? "\n" : " ";
    }
    return output;
}

function stripCodeFences(value: string): string {
    let output = "";
    let cursor = 0;
    while (cursor < value.length) {
        const open = value.indexOf("```", cursor);
        if (open === -1) {
            output += value.slice(cursor);
            break;
        }
        output += value.slice(cursor, open);
        const close = value.indexOf("```", open + 3);
        if (close === -1) {
            break;
        }
        output += " ";
        cursor = close + 3;
    }
    return output;
}

function stripIpv6Brackets(value: string): string {
    return value.startsWith("[") && value.endsWith("]")
        ? value.slice(1, -1)
        : value;
}

function stripLeadingWww(value: string): string {
    return value.slice(0, 4).toLowerCase() === "www." ? value.slice(4) : value;
}

function stripTags(value: string): string {
    let output = "";
    let cursor = 0;
    while (cursor < value.length) {
        const open = value.indexOf("<", cursor);
        if (open === -1) {
            output += value.slice(cursor);
            break;
        }
        output += value.slice(cursor, open);
        const close = value.indexOf(">", open + 1);
        if (close === -1) {
            break;
        }
        cursor = close + 1;
    }
    return output;
}

function stripTrailingDot(value: string): string {
    return value.endsWith(".") ? value.slice(0, -1) : value;
}

function trimUrlPunctuation(value: string): string {
    let next = value;
    while (endsWithUrlPunctuation(next)) {
        const last = next.at(-1);
        if (last === ")" && hasBalancedParens(next)) {
            break;
        }
        next = next.slice(0, -1);
    }
    return next;
}

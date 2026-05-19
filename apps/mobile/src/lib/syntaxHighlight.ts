import hljs from "highlight.js";

export type CodeHighlightKind =
    | "attribute"
    | "builtIn"
    | "comment"
    | "keyword"
    | "literal"
    | "number"
    | "string"
    | "title";

export interface HighlightedCodeSegment {
    kind?: CodeHighlightKind;
    text: string;
}

const SPAN_TAG_RE = /<\/span>|<span class="([^"]+)">/g;

export function highlightCode(
    code: string,
    language?: string,
): HighlightedCodeSegment[] {
    return parseHighlightedHtml(highlightHtmlForCode(code, language));
}

function classNameToKind(className: string): CodeHighlightKind | undefined {
    const classes = className.split(/\s+/);
    if (classes.includes("hljs-comment") || classes.includes("hljs-quote")) {
        return "comment";
    }
    if (
        classes.includes("hljs-keyword") ||
        classes.includes("hljs-selector-tag")
    ) {
        return "keyword";
    }
    if (classes.includes("hljs-string") || classes.includes("hljs-regexp")) {
        return "string";
    }
    if (classes.includes("hljs-number")) {
        return "number";
    }
    if (classes.includes("hljs-literal")) {
        return "literal";
    }
    if (
        classes.includes("hljs-title") ||
        classes.includes("hljs-name") ||
        classes.includes("hljs-section")
    ) {
        return "title";
    }
    if (classes.includes("hljs-attr") || classes.includes("hljs-attribute")) {
        return "attribute";
    }
    if (classes.includes("hljs-built_in") || classes.includes("hljs-type")) {
        return "builtIn";
    }
    return undefined;
}

function codeFallback(html: string): string {
    return stripHtmlTags(decodeHtmlEntities(html));
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

function highlightHtmlForCode(code: string, language?: string): string {
    const normalizedLanguage = language?.trim().toLowerCase();
    if (normalizedLanguage && hljs.getLanguage(normalizedLanguage)) {
        return hljs.highlight(code, {
            ignoreIllegals: true,
            language: normalizedLanguage,
        }).value;
    }
    return hljs.highlightAuto(code).value;
}

function isValidCodePoint(value: number): boolean {
    return Number.isInteger(value) && value >= 0 && value <= 0x10ffff;
}

function parseHighlightedHtml(html: string): HighlightedCodeSegment[] {
    const segments: HighlightedCodeSegment[] = [];
    const classStack: string[] = [];
    let cursor = 0;

    const currentKind = (): CodeHighlightKind | undefined => {
        for (let index = classStack.length - 1; index >= 0; index--) {
            const className = classStack[index];
            if (!className) {
                continue;
            }
            const kind = classNameToKind(className);
            if (kind) {
                return kind;
            }
        }
        return undefined;
    };

    for (const match of html.matchAll(SPAN_TAG_RE)) {
        const index = match.index;
        if (index === undefined) {
            continue;
        }
        pushHighlightedText(segments, html.slice(cursor, index), currentKind());
        if (match[0] === "</span>") {
            classStack.pop();
        } else {
            classStack.push(match[1] ?? "");
        }
        cursor = index + match[0].length;
    }

    pushHighlightedText(segments, html.slice(cursor), currentKind());
    return segments.length > 0 ? segments : [{ text: codeFallback(html) }];
}

function pushHighlightedText(
    segments: HighlightedCodeSegment[],
    rawText: string,
    kind: CodeHighlightKind | undefined,
): void {
    if (!rawText) {
        return;
    }
    const text = decodeHtmlEntities(rawText);
    const previous = segments[segments.length - 1];
    if (previous && previous.kind === kind) {
        previous.text += text;
        return;
    }
    segments.push({
        ...(kind ? { kind } : {}),
        text,
    });
}

function stripHtmlTags(value: string): string {
    let output = "";
    let index = 0;
    while (index < value.length) {
        const open = value.indexOf("<", index);
        if (open === -1) {
            output += value.slice(index);
            break;
        }
        output += value.slice(index, open);
        const close = value.indexOf(">", open + 1);
        if (close === -1) {
            break;
        }
        index = close + 1;
    }
    return output;
}

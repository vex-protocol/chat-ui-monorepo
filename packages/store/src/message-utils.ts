import type { Message } from "@vex-chat/libvex";

// ── File attachment markdown ─────────────────────────────────────────────────

export interface EncryptedFileAttachment extends FileAttachment {
    key: string;
}

export interface FileAttachment {
    contentType: string;
    fileID: string;
    fileName: string;
    fileSize: number;
    key?: string | undefined;
}

export type MarkdownInlineSegment =
    | { text: string; type: "code" }
    | { text: string; type: "emphasis" }
    | { text: string; type: "link"; url: string }
    | { text: string; type: "strong" }
    | { text: string; type: "text" };

export interface MessageChunk {
    authorID: string;
    firstTime: string;
    messages: Message[];
}

export type MessageMarkdownNode =
    | {
          alt: string;
          attachment: EncryptedFileAttachment;
          image: boolean;
          type: "attachment";
      }
    | { segments: MarkdownInlineSegment[]; type: "text" };

// ── Avatar hue ───────────────────────────────────────────────────────────────

/** Deterministic hue (0–359) from any string (userID, serverID, etc.) for avatar backgrounds. */
export function avatarHue(id: string): number {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return Math.abs(h) % 360;
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return String(bytes) + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function isImageType(contentType: string): boolean {
    return contentType.startsWith("image/");
}

// ── File attachment parsing ──────────────────────────────────────────────────

const VEX_FILE_SCHEME = "vex-file://";
const VEX_FILE_MARKDOWN_RE = /(!?)\[((?:\\.|[^\]\\\n])*)\]\(([^)\n]+)\)/g;

export function formatFileAttachmentMarkdown(
    attachment: EncryptedFileAttachment,
): string {
    const params = new URLSearchParams();
    params.set("key", attachment.key);
    params.set("name", attachment.fileName);
    params.set("type", attachment.contentType);
    params.set("size", String(Math.max(0, attachment.fileSize)));

    const url = `${VEX_FILE_SCHEME}${encodeURIComponent(
        attachment.fileID,
    )}?${params.toString()}`;
    const label = escapeMarkdownLabel(attachment.fileName);
    if (isImageType(attachment.contentType)) {
        return `![${label}](${url})`;
    }
    return `[${label}](${url})`;
}

export function parseFileExtra(extra: null | string): FileAttachment | null {
    if (!extra) return null;
    try {
        const obj: unknown = JSON.parse(extra);
        if (
            typeof obj === "object" &&
            obj !== null &&
            "fileID" in obj &&
            typeof (obj as FileAttachment).fileID === "string" &&
            "fileName" in obj &&
            typeof (obj as FileAttachment).fileName === "string"
        ) {
            return obj as FileAttachment;
        }
    } catch {
        /* not file JSON */
    }
    return null;
}

export function parseMessageMarkdown(content: string): MessageMarkdownNode[] {
    const nodes: MessageMarkdownNode[] = [];
    let cursor = 0;
    VEX_FILE_MARKDOWN_RE.lastIndex = 0;

    for (const match of content.matchAll(VEX_FILE_MARKDOWN_RE)) {
        const fullMatch = match[0] ?? "";
        const matchIndex = match.index ?? 0;
        const url = match[3] ?? "";
        const attachment = parseVexFileUrl(url);
        if (!attachment) {
            continue;
        }

        pushTextNode(nodes, content.slice(cursor, matchIndex));
        const alt = unescapeMarkdownLabel(match[2] ?? "");
        nodes.push({
            alt,
            attachment,
            image:
                (match[1] ?? "") === "!" || isImageType(attachment.contentType),
            type: "attachment",
        });
        cursor = matchIndex + fullMatch.length;
    }

    pushTextNode(nodes, content.slice(cursor));
    return nodes;
}

export function parseVexFileUrl(url: string): EncryptedFileAttachment | null {
    if (!url.startsWith(VEX_FILE_SCHEME)) {
        return null;
    }

    const rest = url.slice(VEX_FILE_SCHEME.length);
    const queryStart = rest.indexOf("?");
    const encodedFileID = queryStart === -1 ? rest : rest.slice(0, queryStart);
    const query = queryStart === -1 ? "" : rest.slice(queryStart + 1);

    let fileID: string;
    try {
        fileID = decodeURIComponent(encodedFileID).trim();
    } catch {
        return null;
    }

    const params = new URLSearchParams(query);
    const key = params.get("key")?.trim() ?? "";
    const fileName = params.get("name")?.trim() ?? "";
    const contentType =
        params.get("type")?.trim() || "application/octet-stream";
    const rawSize = Number(params.get("size") ?? "0");
    const fileSize =
        Number.isFinite(rawSize) && rawSize >= 0 ? Math.round(rawSize) : 0;

    if (!fileID || !key || !fileName) {
        return null;
    }

    return {
        contentType,
        fileID,
        fileName,
        fileSize,
        key,
    };
}

function escapeMarkdownLabel(value: string): string {
    return value
        .replace(/\\/g, "\\\\")
        .replace(/\[/g, "\\[")
        .replace(/\]/g, "\\]");
}

function findMarkdownLabelEnd(source: string, start: number): number {
    let escaped = false;
    for (let index = start; index < source.length; index++) {
        const char = source[index];
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

function parseInlineMarkdown(text: string): MarkdownInlineSegment[] {
    const segments: MarkdownInlineSegment[] = [];
    let cursor = 0;
    let index = 0;

    const pushPlain = (end: number): void => {
        if (end <= cursor) return;
        pushSegment(segments, {
            text: text.slice(cursor, end),
            type: "text",
        });
    };

    while (index < text.length) {
        const char = text[index];
        const next = text[index + 1];

        if (char === "`") {
            const close = text.indexOf("`", index + 1);
            if (close > index + 1) {
                pushPlain(index);
                pushSegment(segments, {
                    text: text.slice(index + 1, close),
                    type: "code",
                });
                index = close + 1;
                cursor = index;
                continue;
            }
        }

        if (char === "*" && next === "*") {
            const close = text.indexOf("**", index + 2);
            if (close > index + 2) {
                pushPlain(index);
                pushSegment(segments, {
                    text: text.slice(index + 2, close),
                    type: "strong",
                });
                index = close + 2;
                cursor = index;
                continue;
            }
        }

        if (char === "*") {
            const close = text.indexOf("*", index + 1);
            if (close > index + 1) {
                pushPlain(index);
                pushSegment(segments, {
                    text: text.slice(index + 1, close),
                    type: "emphasis",
                });
                index = close + 1;
                cursor = index;
                continue;
            }
        }

        if (char === "[") {
            const labelEnd = findMarkdownLabelEnd(text, index + 1);
            if (labelEnd > index + 1 && text[labelEnd + 1] === "(") {
                const urlEnd = text.indexOf(")", labelEnd + 2);
                if (urlEnd > labelEnd + 2) {
                    const url = text.slice(labelEnd + 2, urlEnd).trim();
                    if (url.length > 0) {
                        pushPlain(index);
                        pushSegment(segments, {
                            text: unescapeMarkdownLabel(
                                text.slice(index + 1, labelEnd),
                            ),
                            type: "link",
                            url,
                        });
                        index = urlEnd + 1;
                        cursor = index;
                        continue;
                    }
                }
            }
        }

        index++;
    }

    pushPlain(text.length);
    if (segments.length === 0) {
        return [{ text, type: "text" }];
    }
    return segments;
}

function pushSegment(
    segments: MarkdownInlineSegment[],
    segment: MarkdownInlineSegment,
): void {
    const previous = segments[segments.length - 1];
    if (segment.type === "text" && previous?.type === "text") {
        previous.text += segment.text;
        return;
    }
    segments.push(segment);
}

function pushTextNode(nodes: MessageMarkdownNode[], text: string): void {
    if (text.length === 0) return;
    nodes.push({
        segments: parseInlineMarkdown(text),
        type: "text",
    });
}

function unescapeMarkdownLabel(value: string): string {
    return value.replace(/\\([\\[\]])/g, "$1");
}

// ── Message chunking ─────────────────────────────────────────────────────────

const CHUNK_GAP_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CHUNK_SIZE = 100;

/**
 * Groups messages by sender into display chunks.
 * Starts a new chunk on: different sender, >5 min gap, or 100 message cap.
 */
export function chunkMessages(messages: Message[]): MessageChunk[] {
    const sorted = [...messages].sort(
        (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    const chunks: MessageChunk[] = [];

    for (const msg of sorted) {
        const last = chunks[chunks.length - 1];
        const lastMsg = last?.messages[last.messages.length - 1];

        const sameAuthor = last?.authorID === msg.authorID;
        const withinGap = lastMsg
            ? new Date(msg.timestamp).getTime() -
                  new Date(lastMsg.timestamp).getTime() <
              CHUNK_GAP_MS
            : false;
        const notFull = (last?.messages.length ?? 0) < MAX_CHUNK_SIZE;

        if (last && sameAuthor && withinGap && notFull) {
            last.messages.push(msg);
        } else {
            chunks.push({
                authorID: msg.authorID,
                firstTime: msg.timestamp,
                messages: [msg],
            });
        }
    }

    return chunks;
}

// ── Emoji shortcodes ────────────────────────────────────────────────────────

const EMOJI: Record<string, string> = {
    "-1": "👎",
    "+1": "👍",
    angry: "😠",
    check: "✅",
    clap: "👏",
    confused: "😕",
    cool: "😎",
    cry: "😢",
    dizzy: "😵",
    eyes: "👀",
    fire: "🔥",
    grin: "😁",
    heart: "❤️",
    joy: "😂",
    laugh: "😂",
    muscle: "💪",
    ok: "👌",
    pray: "🙏",
    rocket: "🚀",
    shrug: "🤷",
    smile: "😊",
    star: "⭐",
    tada: "🎉",
    think: "🤔",
    thumbsdown: "👎",
    thumbsup: "👍",
    wave: "👋",
    x: "❌",
    zzz: "😴",
};

/** Replaces :shortcode: with emoji characters. Accepts word-char or
 * leading `+`/`-` (so `:+1:` and `:-1:` work alongside `:thumbsup:`).
 * Leading `-` is placed first in the character class so it's treated
 * as a literal, not a range. */
export function applyEmoji(text: string): string {
    return text.replace(
        /:([-+\w][-+\w]*):/g,
        (m, name: string) => EMOJI[name] ?? m,
    );
}

// ── Date formatting ─────────────────────────────────────────────────────────

/**
 * Formats a timestamp for display.
 * Accepts a Date object or an ISO 8601 string.
 * Same day → "HH:mm". Earlier → "MMM D HH:mm".
 */
export function formatTime(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const hhmm = d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
    if (sameDay) return hhmm;
    return (
        d.toLocaleDateString([], { day: "numeric", month: "short" }) +
        " " +
        hhmm
    );
}

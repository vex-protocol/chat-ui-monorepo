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

export type MessageEmoji =
    | {
          imageUrl?: string;
          kind: "custom";
          name: string;
          sourceID?: string;
      }
    | {
          kind: "unicode";
          shortcode?: string;
          value: string;
      };

export interface MessageExtra {
    [key: string]: unknown;
    reactionEvent?: MessageReactionEvent;
    reactions?: MessageReaction[];
    version: 1;
}

export type MessageMarkdownNode =
    | {
          alt: string;
          attachment: EncryptedFileAttachment;
          image: boolean;
          type: "attachment";
      }
    | { segments: MarkdownInlineSegment[]; type: "text" };

export interface MessageReaction {
    emoji: MessageEmoji;
    userIDs: string[];
}

export interface MessageReactionEvent {
    action: "toggle";
    emoji: MessageEmoji;
    targetMailID: string;
}

interface MarkdownLinkMatch {
    end: number;
    image: boolean;
    label: string;
    start: number;
    url: string;
}

type MessageWithClientExtra = Message & { extra?: null | string | undefined };

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

const MESSAGE_EXTRA_VERSION = 1;
const INLINE_BARE_URL_RE = /^https?:\/\/[^\s<>()\[\]{}"']+/i;

export function applyMessageReactionEvent(
    messages: Message[],
    event: MessageReactionEvent,
    actorUserID: string,
): Message[] {
    let changed = false;
    const nextMessages = messages.map((message) => {
        if (message.mailID !== event.targetMailID) {
            return message;
        }
        changed = true;
        const current = message as MessageWithClientExtra;
        return {
            ...message,
            extra: toggleMessageReactionExtra(
                current.extra,
                event.emoji,
                actorUserID,
            ),
        } as Message;
    });
    return changed ? nextMessages : messages;
}

export function createReactionEventExtra(
    targetMailID: string,
    emoji: MessageEmoji,
): string {
    return (
        serializeMessageExtra({
            reactionEvent: {
                action: "toggle",
                emoji,
                targetMailID,
            },
            version: MESSAGE_EXTRA_VERSION,
        }) ?? JSON.stringify({ version: MESSAGE_EXTRA_VERSION })
    );
}

export function createUnicodeReactionEmoji(
    value: string,
    shortcode?: string,
): MessageEmoji {
    return {
        kind: "unicode",
        ...(shortcode ? { shortcode } : {}),
        value,
    };
}

export function emojiReactionKey(emoji: MessageEmoji): string {
    if (emoji.kind === "custom") {
        return `custom:${emoji.sourceID ?? emoji.name}`;
    }
    return `unicode:${emoji.value}`;
}

export function emojiReactionLabel(emoji: MessageEmoji): string {
    if (emoji.kind === "custom") {
        return emoji.name.startsWith(":") ? emoji.name : `:${emoji.name}:`;
    }
    return emoji.value;
}

export function foldMessageReactionEvents(messages: Message[]): Message[] {
    let visibleMessages: Message[] = [];
    for (const message of messages) {
        const event = messageReactionEvent(message);
        if (!event) {
            visibleMessages.push(message);
            continue;
        }
        visibleMessages = applyMessageReactionEvent(
            visibleMessages,
            event,
            message.authorID,
        );
    }
    return visibleMessages;
}

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

export function messageReactionEvent(
    message: MessageWithClientExtra,
): MessageReactionEvent | null {
    return parseMessageExtra(message.extra).reactionEvent ?? null;
}

export function messageReactions(
    message: MessageWithClientExtra,
): MessageReaction[] {
    return parseMessageExtra(message.extra).reactions ?? [];
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

export function parseMessageExtra(
    extra: null | string | undefined,
): MessageExtra {
    if (!extra) {
        return { version: MESSAGE_EXTRA_VERSION };
    }

    try {
        const raw: unknown = JSON.parse(extra);
        if (!isRecord(raw)) {
            return { version: MESSAGE_EXTRA_VERSION };
        }

        const reactionEvent = parseMessageReactionEvent(raw["reactionEvent"]);
        const rest = { ...raw };
        delete rest["reactionEvent"];
        delete rest["reactions"];
        delete rest["version"];
        return {
            ...rest,
            ...(reactionEvent ? { reactionEvent } : {}),
            reactions: parseMessageReactions(raw["reactions"]),
            version: MESSAGE_EXTRA_VERSION,
        };
    } catch {
        return { version: MESSAGE_EXTRA_VERSION };
    }
}

export function parseMessageMarkdown(content: string): MessageMarkdownNode[] {
    const nodes: MessageMarkdownNode[] = [];
    let cursor = 0;
    let searchStart = 0;

    while (searchStart < content.length) {
        const match = findNextMarkdownLink(content, searchStart);
        if (!match) {
            break;
        }

        const attachment = parseVexFileUrl(match.url);
        if (!attachment) {
            searchStart = match.end;
            continue;
        }

        pushTextNode(nodes, content.slice(cursor, match.start));
        nodes.push({
            alt: match.label,
            attachment,
            image: match.image || isImageType(attachment.contentType),
            type: "attachment",
        });
        cursor = match.end;
        searchStart = match.end;
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

export function serializeMessageExtra(extra: MessageExtra): null | string {
    const normalized = normalizeMessageExtra(extra);
    if (
        Object.keys(normalized).length === 1 &&
        normalized.version === MESSAGE_EXTRA_VERSION
    ) {
        return null;
    }
    return JSON.stringify(normalized);
}

export function toggleMessageReactionExtra(
    currentExtra: null | string | undefined,
    emoji: MessageEmoji,
    userID: string,
): null | string {
    const extra = parseMessageExtra(currentExtra);
    const reactions = [...(extra.reactions ?? [])];
    const key = emojiReactionKey(emoji);
    const existingIndex = reactions.findIndex(
        (reaction) => emojiReactionKey(reaction.emoji) === key,
    );

    if (existingIndex === -1) {
        reactions.push({ emoji, userIDs: [userID] });
    } else {
        const reaction = reactions[existingIndex];
        if (!reaction) {
            return serializeMessageExtra(extra);
        }
        const userIDs = reaction.userIDs.includes(userID)
            ? reaction.userIDs.filter((id) => id !== userID)
            : [...reaction.userIDs, userID];
        if (userIDs.length === 0) {
            reactions.splice(existingIndex, 1);
        } else {
            reactions[existingIndex] = {
                ...reaction,
                userIDs,
            };
        }
    }

    const nextExtra: MessageExtra = { ...extra };
    if (reactions.length > 0) {
        nextExtra.reactions = reactions;
    } else {
        delete nextExtra.reactions;
    }
    return serializeMessageExtra(nextExtra);
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
    for (let index = start; index < source.length; index++) {
        const char = source[index];
        if (char === "\n") {
            return -1;
        }
        if (char === ")") {
            return index;
        }
    }
    return -1;
}

function findNextMarkdownLink(
    source: string,
    start: number,
): MarkdownLinkMatch | null {
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

        const url = source.slice(urlStart, urlEnd).trim();
        if (!url) {
            index = urlEnd + 1;
            continue;
        }

        return {
            end: urlEnd + 1,
            image,
            label: unescapeMarkdownLabel(source.slice(open + 1, labelEnd)),
            start: image ? index : open,
            url,
        };
    }

    return null;
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

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function matchBareUrlAt(text: string, index: number): null | string {
    const previous = text[index - 1];
    if (
        previous &&
        /[A-Za-z0-9@._~:/?#\[\]@!$&'()*+,;=%-]/.test(previous)
    ) {
        return null;
    }
    const match = INLINE_BARE_URL_RE.exec(text.slice(index));
    if (!match?.[0]) {
        return null;
    }
    return trimInlineUrl(match[0]);
}

function normalizeMessageExtra(extra: MessageExtra): MessageExtra {
    const normalized: MessageExtra = {
        ...extra,
        version: MESSAGE_EXTRA_VERSION,
    };
    const reactions = parseMessageReactions(normalized.reactions);
    const reactionEvent = parseMessageReactionEvent(normalized.reactionEvent);
    if (reactionEvent) {
        normalized.reactionEvent = reactionEvent;
    } else {
        delete normalized.reactionEvent;
    }
    if (reactions.length > 0) {
        normalized.reactions = reactions;
    } else {
        delete normalized.reactions;
    }
    return normalized;
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

        const bareUrl = matchBareUrlAt(text, index);
        if (bareUrl) {
            pushPlain(index);
            pushSegment(segments, {
                text: bareUrl,
                type: "link",
                url: bareUrl,
            });
            index += bareUrl.length;
            cursor = index;
            continue;
        }

        index++;
    }

    pushPlain(text.length);
    if (segments.length === 0) {
        return [{ text, type: "text" }];
    }
    return segments;
}

function parseMessageEmoji(value: unknown): MessageEmoji | null {
    if (!isRecord(value)) {
        return null;
    }

    if (value["kind"] === "unicode" && typeof value["value"] === "string") {
        const shortcode = value["shortcode"];
        return {
            kind: "unicode",
            ...(typeof shortcode === "string" && shortcode !== ""
                ? { shortcode }
                : {}),
            value: value["value"],
        };
    }

    if (value["kind"] === "custom" && typeof value["name"] === "string") {
        const imageUrl = value["imageUrl"];
        const sourceID = value["sourceID"];
        return {
            kind: "custom",
            name: value["name"],
            ...(typeof imageUrl === "string" && imageUrl !== ""
                ? { imageUrl }
                : {}),
            ...(typeof sourceID === "string" && sourceID !== ""
                ? { sourceID }
                : {}),
        };
    }

    return null;
}

function parseMessageReactionEvent(
    value: unknown,
): MessageReactionEvent | undefined {
    if (!isRecord(value)) {
        return undefined;
    }
    const emoji = parseMessageEmoji(value["emoji"]);
    if (
        value["action"] !== "toggle" ||
        !emoji ||
        typeof value["targetMailID"] !== "string" ||
        value["targetMailID"] === ""
    ) {
        return undefined;
    }
    return {
        action: "toggle",
        emoji,
        targetMailID: value["targetMailID"],
    };
}

function parseMessageReactions(value: unknown): MessageReaction[] {
    if (!Array.isArray(value)) {
        return [];
    }

    const reactions: MessageReaction[] = [];
    const seen = new Set<string>();
    for (const item of value) {
        if (!isRecord(item)) {
            continue;
        }
        const emoji = parseMessageEmoji(item["emoji"]);
        if (!emoji) {
            continue;
        }
        const userIDs = Array.isArray(item["userIDs"])
            ? item["userIDs"].filter(
                  (id): id is string => typeof id === "string" && id !== "",
              )
            : [];
        const uniqueUserIDs = [...new Set(userIDs)];
        if (uniqueUserIDs.length === 0) {
            continue;
        }

        const key = emojiReactionKey(emoji);
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        reactions.push({ emoji, userIDs: uniqueUserIDs });
    }
    return reactions;
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

function trimInlineUrl(value: string): string {
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

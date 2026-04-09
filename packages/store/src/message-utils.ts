import type { Message } from "@vex-chat/libvex";

// ── Avatar hue ───────────────────────────────────────────────────────────────

export interface FileAttachment {
    contentType: string;
    fileID: string;
    fileName: string;
    fileSize: number;
}

// ── File attachment parsing ──────────────────────────────────────────────────

export interface MessageChunk {
    authorID: string;
    firstTime: Date;
    messages: Message[];
}

/** Deterministic hue (0–359) from any string (userID, serverID, etc.) for avatar backgrounds. */
export function avatarHue(id: string): number {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return Math.abs(h) % 360;
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function isImageType(contentType: string): boolean {
    return contentType.startsWith("image/");
}

// ── Message chunking ─────────────────────────────────────────────────────────

export function parseFileExtra(extra: null | string): FileAttachment | null {
    if (!extra) return null;
    try {
        const obj = JSON.parse(extra);
        if (
            obj &&
            typeof obj.fileID === "string" &&
            typeof obj.fileName === "string"
        ) {
            return obj as FileAttachment;
        }
    } catch {
        /* not file JSON */
    }
    return null;
}

const CHUNK_GAP_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CHUNK_SIZE = 100;

/**
 * Groups messages by sender into display chunks.
 * Starts a new chunk on: different sender, >5 min gap, or 100 message cap.
 */
export function chunkMessages(messages: Message[]): MessageChunk[] {
    const sorted = [...messages].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
    const chunks: MessageChunk[] = [];

    for (const msg of sorted) {
        const last = chunks[chunks.length - 1];
        const lastMsg = last?.messages[last.messages.length - 1];

        const sameAuthor = last?.authorID === msg.authorID;
        const withinGap = lastMsg
            ? msg.timestamp.getTime() - lastMsg.timestamp.getTime() <
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

/** Replaces :shortcode: with emoji characters. */
export function applyEmoji(text: string): string {
    return text.replace(/:(\w[+\w-]*):/g, (m, name) => EMOJI[name] ?? m);
}

// ── Date formatting ─────────────────────────────────────────────────────────

/**
 * Formats a Date for display.
 * Same day → "HH:mm". Earlier → "MMM D HH:mm".
 */
export function formatTime(date: Date): string {
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    const hhmm = date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
    if (sameDay) return hhmm;
    return (
        date.toLocaleDateString([], { day: "numeric", month: "short" }) +
        " " +
        hhmm
    );
}

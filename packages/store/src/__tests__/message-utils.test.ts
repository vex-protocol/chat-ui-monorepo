import type { Message } from "@vex-chat/libvex";

import { describe, expect, test } from "vitest";

import {
    applyEmoji,
    avatarHue,
    chunkMessages,
    formatFileSize,
    formatTime,
    isImageType,
    parseFileExtra,
} from "../message-utils.ts";

// ── Test helpers ────────────────────────────────────────────────────────────

function makeMessage(overrides: Partial<Message> = {}): Message {
    return {
        authorID: "alice",
        direction: "incoming",
        extra: null,
        group: null,
        mailID: "00000000-0000-0000-0000-000000000001",
        message: "hello",
        recipientID: "bob",
        timestamp: "2026-04-10T12:00:00.000Z",
        ...overrides,
    } as Message;
}

// ── avatarHue ───────────────────────────────────────────────────────────────

describe("avatarHue", () => {
    test("returns a number in [0, 360)", () => {
        expect(avatarHue("alice")).toBeGreaterThanOrEqual(0);
        expect(avatarHue("alice")).toBeLessThan(360);
    });

    test("is deterministic — same input always produces same hue", () => {
        expect(avatarHue("alice")).toBe(avatarHue("alice"));
        expect(avatarHue("3f2ae9b8-1234-5678-9abc-000000000001")).toBe(
            avatarHue("3f2ae9b8-1234-5678-9abc-000000000001"),
        );
    });

    test("distributes distinct inputs across the hue range", () => {
        const hues = new Set<number>();
        for (let i = 0; i < 50; i++) {
            hues.add(avatarHue(`user-${i.toString()}`));
        }
        // Distinct inputs should hit at least half the buckets; anything
        // worse suggests the hash collapsed to a single hue.
        expect(hues.size).toBeGreaterThan(20);
    });

    test("handles empty string", () => {
        expect(avatarHue("")).toBe(0);
    });
});

// ── formatFileSize ──────────────────────────────────────────────────────────

describe("formatFileSize", () => {
    test("bytes under 1 KB render as 'N B'", () => {
        expect(formatFileSize(0)).toBe("0 B");
        expect(formatFileSize(1)).toBe("1 B");
        expect(formatFileSize(512)).toBe("512 B");
        expect(formatFileSize(1023)).toBe("1023 B");
    });

    test("kilobytes render with one decimal", () => {
        expect(formatFileSize(1024)).toBe("1.0 KB");
        expect(formatFileSize(1536)).toBe("1.5 KB");
        expect(formatFileSize(1024 * 1023)).toBe("1023.0 KB");
    });

    test("megabytes render with one decimal", () => {
        expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
        expect(formatFileSize(1024 * 1024 * 5.25)).toBe("5.3 MB");
    });
});

// ── isImageType ─────────────────────────────────────────────────────────────

describe("isImageType", () => {
    test("accepts image/* content types", () => {
        expect(isImageType("image/png")).toBe(true);
        expect(isImageType("image/jpeg")).toBe(true);
        expect(isImageType("image/webp")).toBe(true);
        expect(isImageType("image/gif")).toBe(true);
    });

    test("rejects non-image content types", () => {
        expect(isImageType("application/pdf")).toBe(false);
        expect(isImageType("text/plain")).toBe(false);
        expect(isImageType("video/mp4")).toBe(false);
        expect(isImageType("")).toBe(false);
    });
});

// ── parseFileExtra ──────────────────────────────────────────────────────────

describe("parseFileExtra", () => {
    test("returns null for null input", () => {
        expect(parseFileExtra(null)).toBeNull();
    });

    test("returns null for empty string", () => {
        expect(parseFileExtra("")).toBeNull();
    });

    test("returns null for malformed JSON", () => {
        expect(parseFileExtra("{not-json")).toBeNull();
    });

    test("returns null for JSON missing required fields", () => {
        expect(parseFileExtra('{"fileID": "x"}')).toBeNull();
        expect(parseFileExtra('{"fileName": "x.png"}')).toBeNull();
        expect(parseFileExtra("null")).toBeNull();
        expect(parseFileExtra("[]")).toBeNull();
    });

    test("returns null when fileID is not a string", () => {
        expect(
            parseFileExtra('{"fileID": 42, "fileName": "x.png"}'),
        ).toBeNull();
    });

    test("parses valid FileAttachment JSON", () => {
        const input = JSON.stringify({
            contentType: "image/png",
            fileID: "abc-123",
            fileName: "photo.png",
            fileSize: 2048,
        });
        const result = parseFileExtra(input);
        expect(result).toEqual({
            contentType: "image/png",
            fileID: "abc-123",
            fileName: "photo.png",
            fileSize: 2048,
        });
    });
});

// ── chunkMessages ───────────────────────────────────────────────────────────

describe("chunkMessages", () => {
    test("returns empty array for empty input", () => {
        expect(chunkMessages([])).toEqual([]);
    });

    test("groups consecutive messages from same author into one chunk", () => {
        const msgs = [
            makeMessage({
                mailID: "1",
                timestamp: "2026-04-10T12:00:00.000Z",
            }),
            makeMessage({
                mailID: "2",
                timestamp: "2026-04-10T12:00:30.000Z",
            }),
            makeMessage({
                mailID: "3",
                timestamp: "2026-04-10T12:01:00.000Z",
            }),
        ];
        const chunks = chunkMessages(msgs);
        expect(chunks).toHaveLength(1);
        expect(chunks[0]?.authorID).toBe("alice");
        expect(chunks[0]?.messages).toHaveLength(3);
        expect(chunks[0]?.firstTime).toBe("2026-04-10T12:00:00.000Z");
    });

    test("starts a new chunk when author changes", () => {
        const msgs = [
            makeMessage({
                authorID: "alice",
                mailID: "1",
                timestamp: "2026-04-10T12:00:00.000Z",
            }),
            makeMessage({
                authorID: "bob",
                mailID: "2",
                timestamp: "2026-04-10T12:00:30.000Z",
            }),
            makeMessage({
                authorID: "alice",
                mailID: "3",
                timestamp: "2026-04-10T12:01:00.000Z",
            }),
        ];
        const chunks = chunkMessages(msgs);
        expect(chunks.map((c) => c.authorID)).toEqual([
            "alice",
            "bob",
            "alice",
        ]);
        expect(chunks.every((c) => c.messages.length === 1)).toBe(true);
    });

    test("starts a new chunk after a 5-minute gap", () => {
        const msgs = [
            makeMessage({
                mailID: "1",
                timestamp: "2026-04-10T12:00:00.000Z",
            }),
            makeMessage({
                mailID: "2",
                // 5 min + 1 sec → new chunk
                timestamp: "2026-04-10T12:05:01.000Z",
            }),
        ];
        const chunks = chunkMessages(msgs);
        expect(chunks).toHaveLength(2);
    });

    test("keeps same chunk just under 5 minutes", () => {
        const msgs = [
            makeMessage({
                mailID: "1",
                timestamp: "2026-04-10T12:00:00.000Z",
            }),
            makeMessage({
                mailID: "2",
                // 4 min 59 sec → still same chunk
                timestamp: "2026-04-10T12:04:59.000Z",
            }),
        ];
        const chunks = chunkMessages(msgs);
        expect(chunks).toHaveLength(1);
        expect(chunks[0]?.messages).toHaveLength(2);
    });

    test("sorts out-of-order messages before chunking", () => {
        const msgs = [
            makeMessage({
                mailID: "3",
                timestamp: "2026-04-10T12:02:00.000Z",
            }),
            makeMessage({
                mailID: "1",
                timestamp: "2026-04-10T12:00:00.000Z",
            }),
            makeMessage({
                mailID: "2",
                timestamp: "2026-04-10T12:01:00.000Z",
            }),
        ];
        const chunks = chunkMessages(msgs);
        expect(chunks).toHaveLength(1);
        expect(chunks[0]?.messages.map((m) => m.mailID)).toEqual([
            "1",
            "2",
            "3",
        ]);
    });

    test("caps chunk size at MAX_CHUNK_SIZE (100 messages)", () => {
        const msgs: Message[] = [];
        for (let i = 0; i < 150; i++) {
            msgs.push(
                makeMessage({
                    mailID: i.toString(),
                    timestamp: new Date(
                        Date.UTC(2026, 3, 10, 12, 0, i),
                    ).toISOString(),
                }),
            );
        }
        const chunks = chunkMessages(msgs);
        expect(chunks).toHaveLength(2);
        expect(chunks[0]?.messages).toHaveLength(100);
        expect(chunks[1]?.messages).toHaveLength(50);
    });
});

// ── applyEmoji ──────────────────────────────────────────────────────────────

describe("applyEmoji", () => {
    test("replaces known shortcodes", () => {
        expect(applyEmoji("good :thumbsup: yes")).toBe("good 👍 yes");
        expect(applyEmoji(":heart:")).toBe("❤️");
        expect(applyEmoji(":fire: :rocket:")).toBe("🔥 🚀");
    });

    test("leaves unknown shortcodes unchanged", () => {
        expect(applyEmoji(":not-a-real-emoji:")).toBe(":not-a-real-emoji:");
        expect(applyEmoji(":xyz123:")).toBe(":xyz123:");
    });

    test("handles empty input", () => {
        expect(applyEmoji("")).toBe("");
    });

    test("leaves text without shortcodes unchanged", () => {
        expect(applyEmoji("just regular text")).toBe("just regular text");
    });

    test(":+1: and :-1: shortcodes (GitHub convention)", () => {
        expect(applyEmoji(":+1:")).toBe("👍");
        expect(applyEmoji(":-1:")).toBe("👎");
        // Aliases still work.
        expect(applyEmoji(":thumbsup:")).toBe("👍");
        expect(applyEmoji(":thumbsdown:")).toBe("👎");
    });

    test("does not match empty shortcode `::`", () => {
        expect(applyEmoji("::")).toBe("::");
    });
});

// ── formatTime ──────────────────────────────────────────────────────────────

describe("formatTime", () => {
    test("accepts Date objects", () => {
        const result = formatTime(new Date("2026-04-10T12:00:00.000Z"));
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
    });

    test("accepts ISO 8601 strings", () => {
        const result = formatTime("2026-04-10T12:00:00.000Z");
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
    });

    test("same day renders as HH:mm only (no date prefix)", () => {
        const today = new Date();
        today.setHours(14, 30, 0, 0);
        const result = formatTime(today);
        // Locale-dependent but the string should not include a month name
        // for same-day. Matches the function's branching logic.
        expect(result).not.toMatch(
            /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/,
        );
    });

    test("earlier day includes month name", () => {
        const earlier = new Date("2026-01-15T12:00:00.000Z");
        const result = formatTime(earlier);
        // Should include "Jan" somewhere in the output
        expect(result).toMatch(/Jan/);
    });
});

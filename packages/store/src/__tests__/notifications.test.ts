import type { Message, User } from "@vex-chat/libvex";

import { beforeEach, describe, expect, test } from "vitest";

import { $user } from "../domains/identity.ts";
import { shouldNotify } from "../notifications.ts";

// ── Test helpers ────────────────────────────────────────────────────────────

const ME: User = {
    userID: "me-uuid",
    username: "me",
} as User;

function makeMessage(overrides: Partial<Message> = {}): Message {
    return {
        authorID: "alice",
        direction: "incoming",
        extra: null,
        group: null,
        mailID: "msg-1",
        message: "hello world",
        recipientID: "me-uuid",
        timestamp: "2026-04-10T12:00:00.000Z",
        ...overrides,
    } as Message;
}

describe("shouldNotify", () => {
    beforeEach(() => {
        // Reset the user atom between tests — other tests may have set it.
        // The atom is a WritableAtom under the hood; setting null is legit.
        ($user as unknown as { set: (v: null) => void }).set(null);
    });

    test("returns null when no current user (not logged in)", () => {
        const msg = makeMessage();
        expect(shouldNotify(msg)).toBeNull();
    });

    describe("with logged-in user", () => {
        beforeEach(() => {
            ($user as unknown as { set: (v: User) => void }).set(ME);
        });

        test("returns null for messages authored by self", () => {
            const msg = makeMessage({ authorID: ME.userID });
            expect(shouldNotify(msg)).toBeNull();
        });

        test("notifies even when app is focused on the active DM conversation", () => {
            const msg = makeMessage({ authorID: "alice" });
            const payload = shouldNotify(msg);
            expect(payload).not.toBeNull();
            expect(payload?.conversationKey).toBe("alice");
        });

        test("notifies when app is focused but on a different conversation", () => {
            const msg = makeMessage({ authorID: "alice" });
            const payload = shouldNotify(msg);
            expect(payload).not.toBeNull();
            expect(payload?.conversationKey).toBe("alice");
        });

        test("notifies when app is unfocused even on active conversation", () => {
            const msg = makeMessage({ authorID: "alice" });
            const payload = shouldNotify(msg);
            expect(payload).not.toBeNull();
        });

        test("group message uses channelID as conversation key", () => {
            const msg = makeMessage({
                authorID: "alice",
                group: "channel-42",
            });
            const payload = shouldNotify(msg);
            expect(payload?.conversationKey).toBe("channel-42");
            expect(payload?.group).toBe("channel-42");
        });

        test("group message title includes channel + server name when resolvable", () => {
            const msg = makeMessage({
                authorID: "alice",
                group: "channel-42",
            });
            const payload = shouldNotify(msg, undefined, () => ({
                channelName: "general",
                serverName: "DevHub",
            }));
            expect(payload?.title).toBe("alice (#general, DevHub)");
        });

        test("group message falls back to generic channel title when unresolvable", () => {
            const msg = makeMessage({
                authorID: "alice",
                group: "channel-42",
            });
            const payload = shouldNotify(msg);
            expect(payload?.title).toBe("alice (#channel)");
        });

        test("DM title is just the author name", () => {
            const msg = makeMessage({ authorID: "alice-uuid" });
            const payload = shouldNotify(msg, (uid) =>
                uid === "alice-uuid" ? "Alice Smith" : undefined,
            );
            expect(payload?.title).toBe("Alice Smith");
        });

        test("DM title falls back to truncated userID prefix when no resolver", () => {
            const msg = makeMessage({ authorID: "abcdef1234567890" });
            const payload = shouldNotify(msg);
            expect(payload?.title).toBe("abcdef12");
        });

        test("body passes through short messages unchanged", () => {
            const msg = makeMessage({ message: "short message" });
            const payload = shouldNotify(msg);
            expect(payload?.body).toBe("short message");
        });

        test("body truncates messages over 100 chars with ellipsis", () => {
            const long = "a".repeat(150);
            const msg = makeMessage({ message: long });
            const payload = shouldNotify(msg);
            expect(payload?.body.length).toBe(100);
            expect(payload?.body.endsWith("...")).toBe(true);
        });

        test("body renders exactly 100 char messages without truncation", () => {
            const exact = "a".repeat(100);
            const msg = makeMessage({ message: exact });
            const payload = shouldNotify(msg);
            expect(payload?.body).toBe(exact);
        });
    });
});

import { describe, expect, test } from "vitest";

import { parseInviteID, parseVexLink } from "../deeplink.ts";

// ── parseInviteID ───────────────────────────────────────────────────────────

describe("parseInviteID", () => {
    const validUUID = "3f2ae9b8-c5a7-4d4a-9f3e-1a2b3c4d5e6f";

    test("accepts a bare UUID", () => {
        expect(parseInviteID(validUUID)).toBe(validUUID);
    });

    test("accepts UUID at the end of a full URL", () => {
        expect(parseInviteID(`https://vex.chat/invite/${validUUID}`)).toBe(
            validUUID,
        );
        expect(parseInviteID(`vex://invite/${validUUID}`)).toBe(validUUID);
        expect(parseInviteID(`/invite/${validUUID}`)).toBe(validUUID);
    });

    test("trims whitespace", () => {
        expect(parseInviteID(`  ${validUUID}  `)).toBe(validUUID);
        expect(parseInviteID(`\t${validUUID}\n`)).toBe(validUUID);
    });

    test("is case-insensitive on hex digits", () => {
        const upper = validUUID.toUpperCase();
        expect(parseInviteID(upper)).toBe(upper);
    });

    test("returns null for invalid UUIDs", () => {
        expect(parseInviteID("")).toBeNull();
        expect(parseInviteID("not-a-uuid")).toBeNull();
        expect(parseInviteID("3f2ae9b8-c5a7-4d4a-9f3e-1a2b3c4d")).toBeNull();
        expect(
            parseInviteID("3f2ae9b8-c5a7-4d4a-9f3e-1a2b3c4d5e6f-extra"),
        ).toBeNull();
    });

    test("returns null when only non-UUID segments follow trailing slash", () => {
        expect(parseInviteID("https://vex.chat/invite/")).toBeNull();
        expect(parseInviteID("/invite/not-a-uuid")).toBeNull();
    });
});

// ── parseVexLink ────────────────────────────────────────────────────────────

describe("parseVexLink", () => {
    test("parses vex://invite/<id>", () => {
        const result = parseVexLink("vex://invite/abc-123");
        expect(result).toEqual({ inviteID: "abc-123", type: "invite" });
    });

    test("parses vex://user/<id>", () => {
        const result = parseVexLink("vex://user/alice-uuid");
        expect(result).toEqual({ type: "user", userID: "alice-uuid" });
    });

    test("parses vex://server/<id>", () => {
        const result = parseVexLink("vex://server/server-99");
        expect(result).toEqual({ serverID: "server-99", type: "server" });
    });

    test("returns 'unknown' with raw payload for malformed URLs", () => {
        const result = parseVexLink("not-a-url");
        expect(result).toEqual({ raw: "not-a-url", type: "unknown" });
    });

    test("returns 'unknown' for URLs with recognized host but no ID", () => {
        expect(parseVexLink("vex://invite/")).toEqual({
            raw: "vex://invite/",
            type: "unknown",
        });
        expect(parseVexLink("vex://user/")).toEqual({
            raw: "vex://user/",
            type: "unknown",
        });
    });

    test("returns 'unknown' for URLs with unrecognized host", () => {
        const result = parseVexLink("vex://settings/foo");
        expect(result).toEqual({ raw: "vex://settings/foo", type: "unknown" });
    });

    test("ignores trailing path segments", () => {
        // First segment after the host is the ID; extra segments are dropped.
        const result = parseVexLink("vex://invite/abc-123/extra/junk");
        expect(result).toEqual({ inviteID: "abc-123", type: "invite" });
    });

    test("handles empty string as unknown", () => {
        expect(parseVexLink("")).toEqual({ raw: "", type: "unknown" });
    });
});

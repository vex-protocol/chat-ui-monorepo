/**
 * Parses vex:// URLs into structured link objects.
 * Platform apps handle navigation after parsing.
 */

export type VexLink =
    | { inviteID: string; type: "invite" }
    | { raw: string; type: "unknown" }
    | { serverID: string; type: "server" }
    | { type: "user"; userID: string };

const UUID_PATTERN =
    "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const UUID_RE = new RegExp(`^${UUID_PATTERN}$`, "i");
const EMBEDDED_INVITE_RE = new RegExp(
    `(?:vex://invite/|https?://(?:www\\.)?vex\\.chat/invite/|(?:^|[\\s([{])\\/invite\\/)(${UUID_PATTERN})(?=$|[^0-9a-f-])`,
    "i",
);

/**
 * Finds the first invite UUID in arbitrary message text.
 * Bare UUIDs still need to be the entire input to avoid turning random IDs
 * in chat copy into invite previews.
 */
export function extractInviteID(raw: string): null | string {
    const trimmed = raw.trim();
    if (UUID_RE.test(trimmed)) return trimmed;
    return EMBEDDED_INVITE_RE.exec(raw)?.[1] ?? null;
}

/**
 * Extracts an invite UUID from a raw string.
 * Accepts full URLs (e.g., https://vex.chat/invite/<uuid>) or bare UUIDs.
 */
export function parseInviteID(raw: string): null | string {
    const trimmed = raw.trim();
    const last = trimmed.split("/").pop() ?? "";
    return UUID_RE.test(last) ? last : null;
}

export function parseVexLink(url: string): VexLink {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return { raw: url, type: "unknown" };
    }

    const host = parsed.hostname;
    const segments = parsed.pathname.split("/").filter(Boolean);
    const id = segments[0];

    if (host === "invite" && id) return { inviteID: id, type: "invite" };
    if (host === "user" && id) return { type: "user", userID: id };
    if (host === "server" && id) return { serverID: id, type: "server" };

    return { raw: url, type: "unknown" };
}

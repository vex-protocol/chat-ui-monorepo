/**
 * Parses vex:// URLs into structured link objects.
 * Platform apps handle navigation after parsing.
 */

export type VexLink =
    | { type: "invite"; inviteID: string }
    | { type: "user"; userID: string }
    | { type: "server"; serverID: string }
    | { type: "unknown"; raw: string };

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Extracts an invite UUID from a raw string.
 * Accepts full URLs (e.g., https://vex.chat/invite/<uuid>) or bare UUIDs.
 */
export function parseInviteID(raw: string): string | null {
    const trimmed = raw.trim();
    const last = trimmed.split("/").pop() ?? "";
    return UUID_RE.test(last) ? last : null;
}

export function parseVexLink(url: string): VexLink {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return { type: "unknown", raw: url };
    }

    const host = parsed.hostname;
    const segments = parsed.pathname.split("/").filter(Boolean);
    const id = segments[0];

    if (host === "invite" && id) return { type: "invite", inviteID: id };
    if (host === "user" && id) return { type: "user", userID: id };
    if (host === "server" && id) return { type: "server", serverID: id };

    return { type: "unknown", raw: url };
}

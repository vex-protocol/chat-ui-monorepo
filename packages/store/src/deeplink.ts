/**
 * Parses vex:// URLs into structured link objects.
 * Platform apps handle navigation after parsing.
 */

export type VexLink =
    | { inviteID: string; type: "invite"; }
    | { raw: string; type: "unknown"; }
    | { serverID: string; type: "server"; }
    | { type: "user"; userID: string };

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

import { getServerOptions, getServerUrl } from "./config";

/**
 * Construct the avatar GET URL for a userID against the currently
 * configured server. When `version` is provided we append it as a
 * `?v=<n>` cache buster so React Native's image cache picks up
 * fresh bytes after a known avatar update; otherwise we let the
 * regular HTTP cache do its job.
 */
export function buildAvatarUrl(
    userID: string,
    version?: number,
): null | string {
    if (!userID) {
        return null;
    }
    const opts = getServerOptions();
    const proto = opts.unsafeHttp === true ? "http" : "https";
    const base = `${proto}://${getServerUrl()}/avatar/${userID}`;
    return typeof version === "number" && version > 0
        ? `${base}?v=${version}`
        : base;
}

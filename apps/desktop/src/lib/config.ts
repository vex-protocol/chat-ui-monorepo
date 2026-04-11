/**
 * Runtime configuration helpers.
 */
import type { ServerOptions } from "@vex-chat/store";

const SERVER_URL_KEY = "vex-server-url";

// Production server URL lives in code as a typed constant — never read from
// .env at runtime. A missing or empty VITE_SERVER_URL can only resolve to
// prod, making it impossible to ship a dev URL by forgetting to set something.
const PROD_SERVER_URL = "api.vex.wtf";

// Any host that looks like a local/LAN dev target. Used for the release-build
// fail-safe and for deciding when http:// is acceptable.
const DEV_HOST_RE = /^(localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.|100\.)/i;

const envOverride =
    typeof import.meta.env.VITE_SERVER_URL === "string"
        ? import.meta.env.VITE_SERVER_URL.trim()
        : "";
const DEFAULT_SERVER_URL: string =
    envOverride.length > 0 ? envOverride : PROD_SERVER_URL;

// Fail-safe: a release build must never ship with a dev host compiled in as
// the default. Users can still override via the Settings UI (localStorage).
if (!import.meta.env.DEV && DEV_HOST_RE.test(DEFAULT_SERVER_URL)) {
    throw new Error(
        `[vex] Refusing to start: production build resolved default server URL to "${DEFAULT_SERVER_URL}". ` +
            `VITE_SERVER_URL must not point at a dev address in release builds.`,
    );
}

export function clearSession(): void {
    localStorage.removeItem(SERVER_URL_KEY);
}

/** Server options derived from the current URL — use everywhere. */
export function getServerOptions(): ServerOptions {
    const host = getServerUrl();
    return {
        host,
        unsafeHttp: host.startsWith("http://") || DEV_HOST_RE.test(host),
    };
}

export function getServerUrl(): string {
    return localStorage.getItem(SERVER_URL_KEY) ?? DEFAULT_SERVER_URL;
}

export function setServerUrl(url: string): void {
    localStorage.setItem(SERVER_URL_KEY, url.replace(/\/$/, ""));
}

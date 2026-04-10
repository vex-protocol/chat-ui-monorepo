/**
 * Runtime configuration helpers.
 */
import type { ServerOptions } from "@vex-chat/store";

const SERVER_URL_KEY = "vex-server-url";
// Default to production unless explicitly overridden by env/local settings.
const DEFAULT_SERVER_URL = import.meta.env.VITE_SERVER_URL || "api.vex.wtf";

export function getServerUrl(): string {
    return localStorage.getItem(SERVER_URL_KEY) ?? DEFAULT_SERVER_URL;
}

export function setServerUrl(url: string): void {
    localStorage.setItem(SERVER_URL_KEY, url.replace(/\/$/, ""));
}

/** Server options derived from the current URL — use everywhere. */
export function getServerOptions(): ServerOptions {
    const host = getServerUrl();
    return {
        host,
        unsafeHttp:
            host.startsWith("http:") ||
            host.startsWith("localhost") ||
            host.startsWith("127.0.0.1"),
    };
}

export function clearSession(): void {
    localStorage.removeItem(SERVER_URL_KEY);
}

import type { ServerOptions } from "@vex-chat/store";

export function getServerOptions(): ServerOptions {
    const host = getServerUrl();
    return {
        host,
        unsafeHttp: host.startsWith("http:") || host.startsWith("localhost"),
    };
}

// Server host — no protocol prefix (Client adds http:// or https:// based on unsafeHttp)
const DEFAULT_SERVER_URL =
    typeof __DEV__ !== "undefined" && __DEV__
        ? "localhost:16777"
        : "api.vex.wtf";

export function getServerUrl(): string {
    return DEFAULT_SERVER_URL;
}

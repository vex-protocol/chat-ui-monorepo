import type { ServerOptions } from "@vex-chat/store";

const DEFAULT_SERVER_URL = "api.vex.wtf";

// Server host — no protocol prefix (Client adds http:// or https:// based on unsafeHttp)
export function getServerUrl(): string {
    const envUrl = process.env.EXPO_PUBLIC_SERVER_URL?.trim();
    const selected = envUrl && envUrl.length > 0 ? envUrl : DEFAULT_SERVER_URL;
    return selected.replace(/\/+$/, "");
}

export function getServerOptions(): ServerOptions {
    const host = getServerUrl();
    return {
        host,
        unsafeHttp: host.startsWith("http://") || host.startsWith("localhost"),
    };
}

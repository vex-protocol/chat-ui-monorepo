import type { ServerOptions } from "@vex-chat/store";

export function getServerOptions(): ServerOptions {
    const host = getServerUrl();
    return {
        host,
        unsafeHttp: host.startsWith("http:") || host.startsWith("localhost"),
    };
}

// Server host — no protocol prefix (Client adds http:// or https:// based on unsafeHttp)
export function getServerUrl(): string {
    return "localhost:16777";
}

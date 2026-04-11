import type { ServerOptions } from "@vex-chat/store";

// Production server URL lives in code as a typed constant — never read from
// .env. A missing or empty override can only resolve to prod, making it
// impossible to ship a dev URL by forgetting to set something.
const PROD_SERVER_URL = "api.vex.wtf";

// Any host that looks like a local/LAN dev target. Used for the release-build
// fail-safe and for deciding when http:// is acceptable.
const DEV_HOST_RE = /^(localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.|100\.)/i;

export function getServerOptions(): ServerOptions {
    const host = getServerUrl();
    return {
        host,
        unsafeHttp: host.startsWith("http://") || DEV_HOST_RE.test(host),
    };
}

// Server host — no protocol prefix (Client adds http:// or https:// based on unsafeHttp)
export function getServerUrl(): string {
    const override = readOverride();
    const host = (override ?? PROD_SERVER_URL).replace(/\/+$/, "");

    // Fail-safe: a release build must never resolve to a dev host.
    if (!__DEV__ && DEV_HOST_RE.test(host)) {
        throw new Error(
            `[vex] Refusing to start: production build resolved server URL to "${host}". ` +
                `EXPO_PUBLIC_SERVER_URL must not point at a dev address in release builds.`,
        );
    }
    return host;
}

function readOverride(): string | undefined {
    const raw = (
        process.env.EXPO_PUBLIC_SERVER_URL as string | undefined
    )?.trim();
    return raw && raw.length > 0 ? raw : undefined;
}

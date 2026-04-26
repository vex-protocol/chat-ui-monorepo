import type { ServerOptions } from "@vex-chat/store";

// Production server URL lives in code as a typed constant — never read from
// .env. A missing or empty override can only resolve to prod, making it
// impossible to ship a dev URL by forgetting to set something.
const PROD_SERVER_URL = "api.vex.wtf";
const DEV_OVERRIDE_FLAG = "EXPO_PUBLIC_ENABLE_DEV_SERVER";

// Any host that looks like a local/LAN dev target. Used for the release-build
// fail-safe and for deciding when http:// is acceptable.
const DEV_HOST_RE = /^(localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.|100\.)/i;

export function getServerOptions(): ServerOptions {
    const host = getServerUrl();
    const override = readOverride();
    const unsafeByScheme = override?.trim().startsWith("http://") ?? false;
    return {
        host,
        unsafeHttp: unsafeByScheme || DEV_HOST_RE.test(host),
    };
}

// Server host — no protocol prefix (Client adds http:// or https:// based on unsafeHttp)
export function getServerUrl(): string {
    const override = readOverride();
    const host = normalizeHost(override ?? PROD_SERVER_URL);

    // Fail-safe: a release build must never resolve to a dev host.
    if (!__DEV__ && DEV_HOST_RE.test(host)) {
        throw new Error(
            `[vex] Refusing to start: production build resolved server URL to "${host}". ` +
                `EXPO_PUBLIC_SERVER_URL must not point at a dev address in release builds.`,
        );
    }
    return host;
}

function normalizeHost(raw: string): string {
    const trimmed = raw.trim();
    if (/^https?:\/\//i.test(trimmed)) {
        try {
            return new URL(trimmed).host.replace(/\/+$/, "");
        } catch {
            const noScheme = trimmed.replace(/^https?:\/\//i, "");
            const firstSegment = noScheme.split("/")[0];
            return (
                trimmed
                    .replace(/^https?:\/\//i, "")
                    .replace(/\/+$/, "")
                    .split("/")[0] ??
                firstSegment ??
                PROD_SERVER_URL
            );
        }
    }
    return trimmed.replace(/\/+$/, "");
}

function readOverride(): string | undefined {
    const allowDevOverride =
        (process.env[DEV_OVERRIDE_FLAG] as string | undefined)?.trim() === "1";
    const raw = (
        process.env["EXPO_PUBLIC_SERVER_URL"] as string | undefined
    )?.trim();
    if (!raw || raw.length === 0) {
        return undefined;
    }
    if (__DEV__ && !allowDevOverride) {
        // Dev defaults to production API unless explicitly opted in.
        return undefined;
    }
    return raw;
}

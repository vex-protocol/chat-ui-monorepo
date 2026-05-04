/*
 * Identity-key backup file format and helpers.
 *
 * The backup contains everything needed to restore a device's signing
 * identity on another physical device: server host, username, userID,
 * deviceID, and the deviceKey (private signing key, hex-encoded).
 *
 * Format (JSON):
 *
 *   {
 *     "type": "vex-identity-backup",
 *     "version": 1,
 *     "exportedAt": "<ISO 8601 timestamp>",
 *     "server": "<host>",
 *     "username": "<lowercase username>",
 *     "userID": "<uuid>",
 *     "deviceID": "<uuid>",
 *     "identityKey": "<hex-encoded private key>"
 *   }
 *
 * Anyone holding the file can sign in as the owner on the target server
 * (until that server revokes the device). Treat it like a password.
 */
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export const BACKUP_FILE_TYPE = "vex-identity-backup";
export const BACKUP_FILE_VERSION = 1;

export interface ExportResult {
    error?: string;
    fileName: string;
    ok: boolean;
    /** Defined when sharing was supported and the user picked a target. */
    sharedTo?: string;
}

export interface IdentityBackup {
    deviceID: string;
    deviceKey: string;
    exportedAt: string;
    server: string;
    type: typeof BACKUP_FILE_TYPE;
    /**
     * Owner's userID. Optional for back-compat with the legacy text-format
     * backups produced before we tracked userID in the export. Empty string
     * means "unknown" — the caller should populate it from the server
     * after a successful sign-in.
     */
    userID: string;
    username: string;
    version: number;
}

export type RestoreParseResult =
    | { backup: IdentityBackup; ok: true }
    | { canceled: true; ok: false }
    | { error: string; ok: false };

/**
 * Write the backup JSON to a temp file and present the OS share sheet so
 * the user can save it (Files app, iCloud Drive, AirDrop, Drive, etc.) or
 * send it via email/messaging.
 *
 * Falls back to a no-op error result on platforms where sharing isn't
 * available (web, etc.). The file in the cache directory persists past
 * the share dialog so the user can retry without re-exporting.
 */
export async function exportIdentityBackupFile(
    backup: Omit<IdentityBackup, "exportedAt" | "type" | "version">,
): Promise<ExportResult> {
    const fileName = backupFileName(backup.username, backup.deviceID);
    const fullBackup: IdentityBackup = {
        ...backup,
        exportedAt: new Date().toISOString(),
        type: BACKUP_FILE_TYPE,
        version: BACKUP_FILE_VERSION,
    };
    const json = `${JSON.stringify(fullBackup, null, 2)}\n`;

    const dir = FileSystem.cacheDirectory;
    if (!dir) {
        return {
            error: "Filesystem unavailable on this platform.",
            fileName,
            ok: false,
        };
    }
    const uri = `${dir}${fileName}`;
    try {
        await FileSystem.writeAsStringAsync(uri, json, {
            encoding: FileSystem.EncodingType.UTF8,
        });
    } catch (err: unknown) {
        return {
            error:
                err instanceof Error
                    ? `Could not write backup file: ${err.message}`
                    : "Could not write backup file.",
            fileName,
            ok: false,
        };
    }

    const sharingAvailable = await Sharing.isAvailableAsync();
    if (!sharingAvailable) {
        return {
            error: "Sharing is not available on this device. The backup was saved to the app's cache.",
            fileName,
            ok: false,
        };
    }

    try {
        await Sharing.shareAsync(uri, {
            dialogTitle: "Save your Vex identity backup",
            mimeType: "application/json",
            // Use a generic JSON MIME type so the OS offers maximum
            // compatibility (Files, Drive, Mail, AirDrop). Some Android
            // launchers ignore unknown MIME types entirely.
            UTI: "public.json",
        });
    } catch (err: unknown) {
        return {
            error:
                err instanceof Error
                    ? err.message
                    : "Could not open the share sheet.",
            fileName,
            ok: false,
        };
    }

    return { fileName, ok: true };
}

/**
 * Validate a raw backup string. Accepts:
 *
 *   1. The current JSON file format (see {@link IdentityBackup}).
 *   2. The legacy text format that earlier app builds shared via
 *      `Share.share({ message: ... })`. Users who saved that text into
 *      Notes / Keep / Mail before the upgrade can paste it here:
 *
 *          # Vex identity key backup
 *          server: vex.wtf
 *          username: alice
 *          deviceID: <uuid>
 *          identityKey: <hex>
 *
 *      The legacy format does not include a `userID`; it'll be backfilled
 *      automatically once the restored account signs in (App.tsx mirrors
 *      `$user.userID` into the keychain on every login).
 *
 * Exposed separately from {@link pickIdentityBackup} so the same parser
 * also drives a paste-from-clipboard restore path.
 */
export function parseIdentityBackup(raw: string): RestoreParseResult {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
        return { error: "The backup is empty.", ok: false };
    }
    // JSON path first — current format.
    if (trimmed.startsWith("{")) {
        return parseJsonBackup(trimmed);
    }
    // Anything else: assume legacy text. The header line is optional.
    return parseTextBackup(trimmed);
}

/**
 * Open the system file picker constrained to JSON files, read the picked
 * file, and parse it as an identity backup. Cancellation is reported as
 * `{ canceled: true }` so callers can distinguish it from a parse failure.
 */
export async function pickIdentityBackup(): Promise<RestoreParseResult> {
    let result: DocumentPicker.DocumentPickerResult;
    try {
        result = await DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: true,
            multiple: false,
            type: ["application/json", "text/plain", "*/*"],
        });
    } catch (err: unknown) {
        return {
            error:
                err instanceof Error
                    ? `Could not open the file picker: ${err.message}`
                    : "Could not open the file picker.",
            ok: false,
        };
    }
    if (result.canceled) {
        return { canceled: true, ok: false };
    }
    const asset = result.assets?.[0];
    if (!asset?.uri) {
        return { error: "No file was selected.", ok: false };
    }
    let raw: string;
    try {
        raw = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.UTF8,
        });
    } catch (err: unknown) {
        return {
            error:
                err instanceof Error
                    ? `Could not read the file: ${err.message}`
                    : "Could not read the file.",
            ok: false,
        };
    }
    return parseIdentityBackup(raw);
}

function parseJsonBackup(raw: string): RestoreParseResult {
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return {
            error: "That file isn't valid JSON. Pick a Vex identity backup file (.json).",
            ok: false,
        };
    }
    if (typeof parsed !== "object" || parsed === null) {
        return {
            error: "Backup file is malformed.",
            ok: false,
        };
    }
    const obj = parsed as Record<string, unknown>;
    const rawType = obj["type"];
    if (rawType !== BACKUP_FILE_TYPE) {
        return {
            error: "That doesn't look like a Vex identity backup.",
            ok: false,
        };
    }
    const rawVersion = obj["version"];
    if (typeof rawVersion !== "number" || rawVersion > BACKUP_FILE_VERSION) {
        const versionLabel =
            typeof rawVersion === "number" ? String(rawVersion) : "unknown";
        return {
            error: `Unsupported backup version (${versionLabel}). Update the app and try again.`,
            ok: false,
        };
    }
    const requiredStrings: (keyof IdentityBackup)[] = [
        "server",
        "username",
        "userID",
        "deviceID",
        "deviceKey",
    ];
    for (const key of requiredStrings) {
        const value = obj[key];
        if (typeof value !== "string" || value.length === 0) {
            return {
                error: `Backup file is missing the "${key}" field.`,
                ok: false,
            };
        }
    }
    const deviceKey = obj["deviceKey"] as string;
    if (!HEX_KEY_PATTERN.test(deviceKey)) {
        return {
            error: "Backup file contains an invalid device key.",
            ok: false,
        };
    }
    const rawExportedAt = obj["exportedAt"];
    return {
        backup: {
            deviceID: obj["deviceID"] as string,
            deviceKey,
            exportedAt: typeof rawExportedAt === "string" ? rawExportedAt : "",
            server: obj["server"] as string,
            type: BACKUP_FILE_TYPE,
            userID: obj["userID"] as string,
            username: obj["username"] as string,
            version: rawVersion,
        },
        ok: true,
    };
}

function parseTextBackup(raw: string): RestoreParseResult {
    // Old format: one `key: value` per line, with an optional `# Vex
    // identity key backup` header. Tolerant to extra whitespace, blank
    // lines, and surrounding noise that might come from copying out of a
    // notes app.
    const fields: Record<string, string> = {};
    for (const line of raw.split(/\r?\n/)) {
        const cleaned = line.trim();
        if (cleaned.length === 0 || cleaned.startsWith("#")) {
            continue;
        }
        const colon = cleaned.indexOf(":");
        if (colon <= 0) {
            continue;
        }
        const key = cleaned.slice(0, colon).trim().toLowerCase();
        const value = cleaned.slice(colon + 1).trim();
        if (key.length > 0 && value.length > 0) {
            fields[key] = value;
        }
    }

    // The legacy export used `identityKey`; tolerate `deviceKey` too in
    // case anyone hand-edited a copy.
    const deviceKey = fields["identitykey"] ?? fields["devicekey"] ?? "";
    const username = fields["username"] ?? "";
    const deviceID = fields["deviceid"] ?? "";
    const server = fields["server"] ?? "";
    if (
        deviceKey.length === 0 ||
        username.length === 0 ||
        deviceID.length === 0 ||
        server.length === 0
    ) {
        return {
            error: "That doesn't look like a Vex identity backup. Expected lines like `server:`, `username:`, `deviceID:`, and `identityKey:`.",
            ok: false,
        };
    }
    if (!HEX_KEY_PATTERN.test(deviceKey)) {
        return {
            error: "Backup contains an invalid device key.",
            ok: false,
        };
    }
    return {
        backup: {
            deviceID,
            deviceKey,
            exportedAt: "",
            server,
            type: BACKUP_FILE_TYPE,
            // Legacy format omitted userID. It backfills after first
            // successful sign-in via the $user subscription in App.tsx.
            userID: fields["userid"] ?? "",
            username: username.toLowerCase(),
            version: BACKUP_FILE_VERSION,
        },
        ok: true,
    };
}

const HEX_KEY_PATTERN = /^[0-9a-fA-F]{32,256}$/;

function backupFileName(username: string, deviceID: string): string {
    const cleanUsername = username
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "")
        .slice(0, 32);
    const shortDevice = deviceID.replace(/[^A-Za-z0-9]+/g, "").slice(0, 8);
    const dateStamp = new Date().toISOString().slice(0, 10);
    return `vex-identity-${cleanUsername || "account"}-${shortDevice}-${dateStamp}.json`;
}

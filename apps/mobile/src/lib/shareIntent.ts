import { NativeModules, Platform } from "react-native";

export interface IncomingShare {
    id: string;
    items: IncomingShareItem[];
    text?: string;
}

export interface IncomingShareItem {
    contentType: string;
    fileName: string;
    fileSize?: number;
    uri: string;
}

interface VexShareIntentNativeModule {
    clearShare(id: string): Promise<void>;
    getInitialShare(): Promise<unknown>;
}

const nativeShareIntent = NativeModules["VexShareIntent"] as
    | undefined
    | VexShareIntentNativeModule;

export async function clearIncomingShareIntent(id: string): Promise<void> {
    if (Platform.OS !== "android" || !nativeShareIntent) {
        return;
    }
    await nativeShareIntent.clearShare(id);
}

export async function getIncomingShareIntent(): Promise<IncomingShare | null> {
    if (Platform.OS !== "android" || !nativeShareIntent) {
        return null;
    }
    const share = await nativeShareIntent.getInitialShare();
    return normalizeShare(share);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object";
}

function normalizeShare(value: unknown): IncomingShare | null {
    const id = isRecord(value) ? value["id"] : undefined;
    if (!isRecord(value) || typeof id !== "string" || !id) {
        return null;
    }

    const rawText = value["text"];
    const text =
        typeof rawText === "string" && rawText.trim()
            ? rawText.trim()
            : undefined;
    const rawItemsValue = value["items"];
    const rawItems = Array.isArray(rawItemsValue) ? rawItemsValue : [];
    const items = rawItems
        .map(normalizeShareItem)
        .filter((item): item is IncomingShareItem => item !== null);

    if (!text && items.length === 0) {
        return null;
    }

    return text
        ? { id, items, text }
        : { id, items };
}

function normalizeShareItem(value: unknown): IncomingShareItem | null {
    const uri = isRecord(value) ? value["uri"] : undefined;
    if (!isRecord(value) || typeof uri !== "string" || !uri) {
        return null;
    }

    const rawFileName = value["fileName"];
    const fileName =
        typeof rawFileName === "string" && rawFileName.trim()
            ? rawFileName.trim()
            : "attachment";
    const rawContentType = value["contentType"];
    const contentType =
        typeof rawContentType === "string" && rawContentType.trim()
            ? rawContentType.trim()
            : "application/octet-stream";
    const item: IncomingShareItem = {
        contentType,
        fileName,
        uri,
    };

    const rawFileSize = value["fileSize"];
    if (
        typeof rawFileSize === "number" &&
        Number.isFinite(rawFileSize) &&
        rawFileSize >= 0
    ) {
        item.fileSize = rawFileSize;
    }

    return item;
}

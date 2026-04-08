import { $client } from "./client.ts";
import { $user } from "./user.ts";

export interface SendGroupMessageOptions {
    extra?: null | string;
    mailType?: string;
}

export interface SendGroupMessageResult {
    error?: string;
    ok: boolean;
}

/**
 * Sends a message to a channel.
 * Client.messages.group() handles member enumeration and multi-device delivery internally.
 */
export async function sendGroupMessage(
    channelID: string,
    content: string,
    _options?: SendGroupMessageOptions,
): Promise<SendGroupMessageResult> {
    const client = $client.get();
    const me = $user.get();
    if (!client || !me) return { error: "Not connected", ok: false };

    try {
        await client.messages.group(channelID, content);
        return { ok: true };
    } catch (err: any) {
        return { error: err?.message ?? "Failed to send message", ok: false };
    }
}

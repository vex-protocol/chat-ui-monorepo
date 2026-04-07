import { $client } from "./client.ts";
import { $user } from "./user.ts";

export interface SendGroupMessageOptions {
    mailType?: string;
    extra?: string | null;
}

export interface SendGroupMessageResult {
    ok: boolean;
    error?: string;
}

/**
 * Sends a message to a channel.
 * Client.messages.group() handles member enumeration and multi-device delivery internally.
 */
export async function sendGroupMessage(
    channelID: string,
    content: string,
    options?: SendGroupMessageOptions,
): Promise<SendGroupMessageResult> {
    const client = $client.get();
    const me = $user.get();
    if (!client || !me) return { ok: false, error: "Not connected" };

    try {
        await client.messages.group(channelID, content);
        return { ok: true };
    } catch (err: any) {
        return { ok: false, error: err?.message ?? "Failed to send message" };
    }
}

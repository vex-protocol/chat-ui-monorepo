import { $client } from "./client.ts";
import { $user } from "./user.ts";

export interface SendDMOptions {
    mailType?: string;
    extra?: string | null;
}

export interface SendDMResult {
    ok: boolean;
    error?: string;
}

/**
 * Sends a direct message to a user.
 * Client.messages.send() handles multi-device delivery and forwarding internally.
 */
export async function sendDirectMessage(
    recipientUserID: string,
    content: string,
    options?: SendDMOptions,
): Promise<SendDMResult> {
    const client = $client.get();
    const me = $user.get();
    if (!client || !me) return { ok: false, error: "Not connected" };

    try {
        await client.messages.send(recipientUserID, content);
        return { ok: true };
    } catch (err: any) {
        return { ok: false, error: err?.message ?? "Failed to send message" };
    }
}

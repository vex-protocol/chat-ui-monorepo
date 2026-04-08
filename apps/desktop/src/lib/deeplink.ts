import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { push } from "svelte-spa-router";
import { parseVexLink } from "@vex-chat/store";

function handleDeepLink(url: string): void {
    const link = parseVexLink(url);
    switch (link.type) {
        case "invite":
            push(`/invite/${link.inviteID}`);
            break;
        case "user":
            push(`/messaging/${link.userID}`);
            break;
        case "server":
            push(`/server/${link.serverID}`);
            break;
    }
}

/**
 * Registers the deep-link listener. Returns an unsubscribe function.
 */
export async function setupDeepLinks(): Promise<() => void> {
    const unlisten = await onOpenUrl((urls) => {
        for (const url of urls) {
            handleDeepLink(url);
        }
    });
    return unlisten;
}

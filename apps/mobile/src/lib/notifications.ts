import type { IMessage as Message } from "@vex-chat/libvex";

import { AppState } from "react-native";

import { shouldNotify, vexService } from "@vex-chat/store";

import notifee, { AndroidImportance, EventType } from "@notifee/react-native";

import { navigateToConversation } from "../navigation/navigationRef";
import { $channels, $familiars, $servers } from "../store";

const CHANNEL_ID = "vex-messages";

let channelReady = false;
let activeConversation: null | string = null;

export async function requestNotificationPermission(): Promise<boolean> {
    const settings = await notifee.requestPermission();
    // authorizationStatus 1 = AUTHORIZED, 2 = PROVISIONAL
    return settings.authorizationStatus >= 1;
}

/** Call from screens to track which conversation the user is viewing. */
export function setActiveConversation(key: null | string): void {
    activeConversation = key;
}

export function setupNotificationHandlers(): () => void {
    // Foreground events (app is open, user taps notification from notification center)
    const unsubForeground = notifee.onForegroundEvent(({ detail, type }) => {
        if (type === EventType.PRESS) {
            handleNotificationPress(detail.notification?.data);
        }
    });

    // Background/killed events (app was closed or backgrounded)
    notifee.onBackgroundEvent(async ({ detail, type }) => {
        if (type === EventType.PRESS) {
            handleNotificationPress(detail.notification?.data);
        }
    });

    return unsubForeground;
}

export async function showMessageNotification(mail: Message): Promise<void> {
    const appFocused = AppState.currentState === "active";
    const familiars = $familiars.get();

    // Resolve author name: check familiars first, then fetch from server
    let authorName = familiars[mail.authorID]?.username;
    if (!authorName) {
        try {
            const user = await vexService.lookupUser(mail.authorID);
            if (user) authorName = user.username;
        } catch {}
    }

    const channels = $channels.get();
    const servers = $servers.get();
    const payload = shouldNotify(
        mail,
        activeConversation,
        appFocused,
        (id) =>
            id === mail.authorID && authorName
                ? authorName
                : familiars[id]?.username,
        (channelID) => {
            for (const [serverID, chs] of Object.entries(channels)) {
                const ch = chs.find((c) => c.channelID === channelID);
                if (ch)
                    return {
                        channelName: ch.name,
                        serverName: servers[serverID]?.name ?? "server",
                    };
            }
            return undefined;
        },
    );
    if (!payload) return;

    await ensureChannel();

    await notifee.displayNotification({
        android: {
            channelId: CHANNEL_ID,
            pressAction: { id: "default" },
            sound: "default",
        },
        body: payload.body,
        data: {
            authorID: payload.authorID,
            username: payload.title,
        },
        ios: {
            sound: "default",
        },
        title: payload.title,
    });
}

async function ensureChannel(): Promise<void> {
    if (channelReady) return;
    await notifee.createChannel({
        id: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        name: "Messages",
        sound: "default",
    });
    channelReady = true;
}

function handleNotificationPress(
    data: Record<string, number | object | string> | undefined,
): void {
    if (!data?.authorID || !data?.username) return;
    navigateToConversation(String(data.authorID), String(data.username));
}

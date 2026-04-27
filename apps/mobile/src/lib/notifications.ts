import type { Message } from "@vex-chat/libvex";

import { AppState } from "react-native";

import { shouldNotify, vexService } from "@vex-chat/store";
import { $channels, $familiars, $servers } from "@vex-chat/store";

import * as Notifications from "expo-notifications";
import { AndroidImportance, IosAuthorizationStatus } from "expo-notifications";

import {
    navigateToChannel,
    navigateToConversation,
} from "../navigation/navigationRef";

const CHANNEL_ID = "vex-messages";

let channelReady = false;
let activeConversation: null | string = null;

interface GroupNotificationTarget {
    channelID: string;
    channelName: string;
    serverID: string;
}

// Show banner + play sound when a notification arrives while the app is open.
Notifications.setNotificationHandler({
    handleNotification: () =>
        Promise.resolve({
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
});

export async function requestNotificationPermission(): Promise<boolean> {
    const settings = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    return (
        settings.granted ||
        settings.ios?.status === IosAuthorizationStatus.PROVISIONAL
    );
}

/** Call from screens to track which conversation the user is viewing. */
export function setActiveConversation(key: null | string): void {
    activeConversation = key;
}

export function setupNotificationHandlers(): () => void {
    // Single listener covers foreground, background, and cold-start taps.
    const subscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
            handleNotificationPress(response.notification.request.content.data);
        },
    );

    // If the app was launched by tapping a notification, replay it.
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) {
        handleNotificationPress(lastResponse.notification.request.content.data);
    }

    return () => {
        subscription.remove();
    };
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
    const groupTarget = mail.group
        ? resolveGroupTarget(mail.group, channels)
        : null;
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

    await Notifications.scheduleNotificationAsync({
        content: {
            body: payload.body,
            data: {
                authorID: payload.authorID,
                channelID: groupTarget?.channelID,
                channelName: groupTarget?.channelName,
                kind: payload.group ? "group" : "dm",
                serverID: groupTarget?.serverID,
                username: payload.title,
            },
            title: payload.title,
        },
        trigger: { channelId: CHANNEL_ID },
    });
}

async function ensureChannel(): Promise<void> {
    if (channelReady) return;
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        importance: AndroidImportance.HIGH,
        name: "Messages",
    });
    channelReady = true;
}

function handleNotificationPress(
    data: Record<string, unknown> | undefined,
): void {
    const kind = data?.["kind"];
    const authorID = data?.["authorID"];
    const channelID = data?.["channelID"];
    const channelName = data?.["channelName"];
    const serverID = data?.["serverID"];
    const username = data?.["username"];
    if (
        kind === "group" &&
        typeof channelID === "string" &&
        typeof channelName === "string" &&
        typeof serverID === "string"
    ) {
        navigateToChannel(channelID, channelName, serverID);
        return;
    }
    if (typeof authorID !== "string" || typeof username !== "string") {
        return;
    }
    navigateToConversation(authorID, username);
}

function resolveGroupTarget(
    channelID: string,
    channels: ReturnType<typeof $channels.get>,
): GroupNotificationTarget | null {
    for (const [serverID, serverChannels] of Object.entries(channels)) {
        const channel = serverChannels.find(
            (item) => item.channelID === channelID,
        );
        if (!channel) {
            continue;
        }
        return {
            channelID: channel.channelID,
            channelName: channel.name,
            serverID,
        };
    }
    return null;
}

import type { RootStackParamList } from "./types";

import { createNavigationContainerRef } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToChannel(
    channelID: string,
    channelName: string,
    serverID: string,
): void {
    if (!navigationRef.isReady()) return;
    navigationRef.navigate("App", {
        params: { channelID, channelName, serverID },
        screen: "Channel",
    });
}

export function navigateToConversation(userID: string, username: string): void {
    if (!navigationRef.isReady()) return;
    navigationRef.navigate("App", {
        params: { userID, username },
        screen: "Conversation",
    });
}

export function navigateToDevices(): void {
    if (!navigationRef.isReady()) return;
    navigationRef.navigate("App", {
        screen: "Devices",
    });
}

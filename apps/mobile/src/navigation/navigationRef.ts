import type { RootStackParamList } from "./types";

import { createNavigationContainerRef } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToConversation(userID: string, username: string): void {
    if (!navigationRef.isReady()) return;
    navigationRef.navigate("App", {
        params: { userID, username },
        screen: "Conversation",
    });
}

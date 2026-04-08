import { createNavigationContainerRef } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef();

export function navigateToConversation(userID: string, username: string): void {
    if (!navigationRef.isReady()) return;
    (navigationRef as any).navigate("App", {
        screen: "Conversation",
        params: { userID, username },
    });
}

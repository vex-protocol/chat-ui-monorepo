import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "@nanostores/react";
import { $familiars, $servers, $channels } from "../store";
import { navigationRef } from "./navigationRef";
import { colors } from "../theme";
import { ServerSidebar } from "../components/ServerSidebar";
import { DMListScreen } from "../screens/DMListScreen";
import { ConversationScreen } from "../screens/ConversationScreen";
import { ChannelListScreen } from "../screens/ChannelListScreen";
import { ChannelScreen } from "../screens/ChannelScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { OnboardingEmptyScreen } from "../screens/OnboardingEmptyScreen";
import { JoinGroupScreen } from "../screens/JoinGroupScreen";
import { AddServerScreen } from "../screens/AddServerScreen";

const Stack = createNativeStackNavigator();

function ContentStack({ initialRoute }: { initialRoute: string }) {
    return (
        <Stack.Navigator
            screenOptions={{ headerShown: false }}
            initialRouteName={initialRoute}
        >
            <Stack.Screen
                name="OnboardingEmpty"
                component={OnboardingEmptyScreen}
            />
            <Stack.Screen name="JoinGroup" component={JoinGroupScreen} />
            <Stack.Screen name="AddServer" component={AddServerScreen} />
            <Stack.Screen name="DMList" component={DMListScreen} />
            <Stack.Screen name="Conversation" component={ConversationScreen} />
            <Stack.Screen name="ChannelList" component={ChannelListScreen} />
            <Stack.Screen name="Channel" component={ChannelScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
    );
}

export function AppTabs() {
    const insets = useSafeAreaInsets();
    const [activeServerId, setActiveServerId] = useState<string | null>(null);
    const familiars = useStore($familiars);
    const servers = useStore($servers);
    const channels = useStore($channels);
    const hasContent =
        Object.keys(familiars).length > 0 || Object.keys(servers).length > 0;

    if (!hasContent) {
        return (
            <View
                style={[
                    styles.fullScreen,
                    { paddingTop: insets.top, paddingBottom: insets.bottom },
                ]}
            >
                <ContentStack initialRoute="OnboardingEmpty" />
            </View>
        );
    }

    return (
        <View
            style={[
                styles.container,
                { paddingTop: insets.top, paddingBottom: insets.bottom },
            ]}
        >
            <ServerSidebar
                activeServerId={activeServerId}
                onSelectServer={(id) => {
                    setActiveServerId(id);
                    const serverChannels = channels[id] ?? [];
                    if (serverChannels.length > 0) {
                        // Go directly to the first channel
                        const ch = serverChannels[0]!;
                        (navigationRef as any).navigate("App", {
                            screen: "Channel",
                            params: {
                                channelID: ch.channelID,
                                channelName: ch.name,
                                serverID: id,
                            },
                        });
                    } else {
                        (navigationRef as any).navigate("App", {
                            screen: "ChannelList",
                            params: { serverID: id },
                        });
                    }
                }}
                onSelectHome={() => {
                    setActiveServerId(null);
                    (navigationRef as any).navigate("App", {
                        screen: "DMList",
                    });
                }}
                onAddServer={() => {
                    (navigationRef as any).navigate("App", {
                        screen: "AddServer",
                    });
                }}
                onSettings={() => {
                    (navigationRef as any).navigate("App", {
                        screen: "Settings",
                    });
                }}
            />
            <View style={styles.content}>
                <ContentStack initialRoute="DMList" />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: "row",
        backgroundColor: colors.bg,
    },
    fullScreen: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    content: {
        flex: 1,
    },
});

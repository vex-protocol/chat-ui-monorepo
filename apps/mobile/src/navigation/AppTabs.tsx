import type { AppStackParamList } from "./types";

import React, { useState } from "react";
import { StyleSheet, View } from "react-native";

import { $channels, $familiars, $servers } from "@vex-chat/store";

import { useStore } from "@nanostores/react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ServerSidebar } from "../components/ServerSidebar";
import { AddServerScreen } from "../screens/AddServerScreen";
import { ChannelListScreen } from "../screens/ChannelListScreen";
import { ChannelScreen } from "../screens/ChannelScreen";
import { ConversationScreen } from "../screens/ConversationScreen";
import { DMListScreen } from "../screens/DMListScreen";
import { InviteScreen } from "../screens/InviteScreen";
import { JoinGroupScreen } from "../screens/JoinGroupScreen";
import { OnboardingEmptyScreen } from "../screens/OnboardingEmptyScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { colors } from "../theme";

import { navigationRef } from "./navigationRef";

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppTabs() {
    const insets = useSafeAreaInsets();
    const [activeServerId, setActiveServerId] = useState<null | string>(null);
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
                    { paddingBottom: insets.bottom, paddingTop: insets.top },
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
                { paddingBottom: insets.bottom, paddingTop: insets.top },
            ]}
        >
            <ServerSidebar
                activeServerId={activeServerId}
                onAddServer={() => {
                    navigationRef.navigate("App", {
                        screen: "AddServer",
                    });
                }}
                onSelectHome={() => {
                    setActiveServerId(null);
                    navigationRef.navigate("App", {
                        screen: "DMList",
                    });
                }}
                onSelectServer={(id) => {
                    setActiveServerId(id);
                    const serverChannels = channels[id] ?? [];
                    const ch = serverChannels[0];
                    if (ch) {
                        // Go directly to the first channel
                        navigationRef.navigate("App", {
                            params: {
                                channelID: ch.channelID,
                                channelName: ch.name,
                                serverID: id,
                            },
                            screen: "Channel",
                        });
                    } else {
                        navigationRef.navigate("App", {
                            params: { serverID: id },
                            screen: "ChannelList",
                        });
                    }
                }}
                onSettings={() => {
                    navigationRef.navigate("App", {
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

function ContentStack({
    initialRoute,
}: {
    initialRoute: keyof AppStackParamList;
}) {
    return (
        <Stack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{ headerShown: false }}
        >
            <Stack.Screen
                component={OnboardingEmptyScreen}
                name="OnboardingEmpty"
            />
            <Stack.Screen component={JoinGroupScreen} name="JoinGroup" />
            <Stack.Screen component={AddServerScreen} name="AddServer" />
            <Stack.Screen component={DMListScreen} name="DMList" />
            <Stack.Screen component={ConversationScreen} name="Conversation" />
            <Stack.Screen component={ChannelListScreen} name="ChannelList" />
            <Stack.Screen component={ChannelScreen} name="Channel" />
            <Stack.Screen component={InviteScreen} name="Invite" />
            <Stack.Screen component={SettingsScreen} name="Settings" />
        </Stack.Navigator>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.bg,
        flex: 1,
        flexDirection: "row",
    },
    content: {
        flex: 1,
    },
    fullScreen: {
        backgroundColor: colors.bg,
        flex: 1,
    },
});

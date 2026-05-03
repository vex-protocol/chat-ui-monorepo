import type { AppStackParamList } from "./types";

import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

import { $authStatus, $channels, $familiars, $servers } from "@vex-chat/store";

import { useStore } from "@nanostores/react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ServerSidebar } from "../components/ServerSidebar";
import { $leftSidebarOpen, $rightSidebarOpen } from "../lib/sidebarState";
import { AddServerScreen } from "../screens/AddServerScreen";
import { ChannelListScreen } from "../screens/ChannelListScreen";
import { ChannelScreen } from "../screens/ChannelScreen";
import { ConversationScreen } from "../screens/ConversationScreen";
import { DeviceDetailsScreen } from "../screens/DeviceDetailsScreen";
import { DeviceRequestsScreen } from "../screens/DeviceRequestsScreen";
import { DMListScreen } from "../screens/DMListScreen";
import { InviteScreen } from "../screens/InviteScreen";
import { JoinGroupScreen } from "../screens/JoinGroupScreen";
import { OnboardingEmptyScreen } from "../screens/OnboardingEmptyScreen";
import { PendingApprovalsScreen } from "../screens/PendingApprovalsScreen";
import { ServerSettingsScreen } from "../screens/ServerSettingsScreen";
import { SessionDetailsScreen } from "../screens/SessionDetailsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { SettingsSectionScreen } from "../screens/SettingsSectionScreen";
import { colors } from "../theme";

import { navigationRef } from "./navigationRef";

const Stack = createNativeStackNavigator<AppStackParamList>();
const SIDEBAR_WIDTH = 304;
const TOP_LEFT_BACK_ROUTES: ReadonlyArray<keyof AppStackParamList> = [
    "AddServer",
    "DeviceDetails",
    "DeviceRequests",
    "Devices",
    "Invite",
    "JoinGroup",
    "ServerSettings",
    "SessionDetails",
    "Settings",
    "SettingsSection",
] as const;
const CHAT_ROUTES: ReadonlyArray<keyof AppStackParamList> = [
    "Channel",
    "Conversation",
] as const;

export function AppTabs() {
    const insets = useSafeAreaInsets();
    const [activeServerId, setActiveServerId] = useState<null | string>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const channels = useStore($channels);
    const _familiars = useStore($familiars);
    const servers = useStore($servers);
    const authStatus = useStore($authStatus);
    const initialRoute: keyof AppStackParamList = "DMList";
    const [currentRoute, setCurrentRoute] =
        useState<keyof AppStackParamList>(initialRoute);
    const [activeChannelId, setActiveChannelId] = useState<null | string>(null);
    const [activeDmUserId, setActiveDmUserId] = useState<null | string>(null);
    const rightSidebarOpen = useStore($rightSidebarOpen);
    const topLeftShowsBack = TOP_LEFT_BACK_ROUTES.includes(currentRoute);
    const isChatRoute = CHAT_ROUTES.includes(currentRoute);
    const sidebarX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
    const backdropOpacity = sidebarX.interpolate({
        inputRange: [-SIDEBAR_WIDTH, 0],
        outputRange: [0, 0.32],
    });
    const toggleX = sidebarX.interpolate({
        inputRange: [-SIDEBAR_WIDTH, 0],
        outputRange: [8, SIDEBAR_WIDTH + 8],
    });

    const openSidebar = () => {
        $rightSidebarOpen.set(false);
        $leftSidebarOpen.set(true);
        setSidebarOpen(true);
        Animated.spring(sidebarX, {
            damping: 18,
            mass: 0.8,
            stiffness: 260,
            toValue: 0,
            useNativeDriver: true,
        }).start();
    };

    const closeSidebar = () => {
        $leftSidebarOpen.set(false);
        Animated.timing(sidebarX, {
            duration: 150,
            toValue: -SIDEBAR_WIDTH,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) {
                setSidebarOpen(false);
            }
        });
    };
    const toggleSidebar = () => {
        if (sidebarOpen) {
            closeSidebar();
            return;
        }
        openSidebar();
    };

    useEffect(() => {
        if (rightSidebarOpen && sidebarOpen) {
            closeSidebar();
        }
    }, [rightSidebarOpen, sidebarOpen]);
    const handleTopLeftPress = () => {
        if (topLeftShowsBack) {
            if (sidebarOpen) {
                closeSidebar();
            }
            if (currentRoute === "Conversation") {
                navigationRef.navigate("App", {
                    screen: "DMList",
                });
                return;
            }
            if (navigationRef.canGoBack()) {
                navigationRef.goBack();
                return;
            }
            navigationRef.navigate("App", {
                screen: "DMList",
            });
            return;
        }
        toggleSidebar();
    };

    return (
        <View style={styles.container}>
            <View
                style={[
                    styles.content,
                    {
                        paddingBottom: isChatRoute ? 0 : insets.bottom,
                        paddingTop: insets.top,
                    },
                ]}
            >
                <ContentStack
                    initialRoute={initialRoute}
                    onRouteChange={(route, params) => {
                        setCurrentRoute(route);
                        if (
                            route === "Channel" ||
                            route === "ChannelList" ||
                            route === "Invite" ||
                            route === "ServerSettings"
                        ) {
                            const serverID =
                                params &&
                                typeof params === "object" &&
                                "serverID" in params &&
                                typeof params.serverID === "string"
                                    ? params.serverID
                                    : null;
                            setActiveServerId(serverID);
                        } else if (
                            route === "DMList" ||
                            route === "Conversation"
                        ) {
                            setActiveServerId(null);
                        }
                        if (route === "Channel") {
                            const channelID =
                                params &&
                                typeof params === "object" &&
                                "channelID" in params &&
                                typeof params.channelID === "string"
                                    ? params.channelID
                                    : null;
                            setActiveChannelId(channelID);
                        } else {
                            setActiveChannelId(null);
                        }
                        if (route === "Conversation") {
                            const userID =
                                params &&
                                typeof params === "object" &&
                                "userID" in params &&
                                typeof params.userID === "string"
                                    ? params.userID
                                    : null;
                            setActiveDmUserId(userID);
                        } else {
                            setActiveDmUserId(null);
                        }
                    }}
                />
            </View>

            <Animated.View
                style={[
                    styles.toggleButtonWrap,
                    {
                        top: insets.top + 10,
                        transform: [{ translateX: toggleX }],
                    },
                ]}
            >
                <View
                    style={[
                        styles.toggleButtonFrame,
                        sidebarOpen
                            ? styles.toggleButtonFrameOpen
                            : styles.toggleButtonFrameClosed,
                    ]}
                >
                    <Pressable
                        onPress={handleTopLeftPress}
                        style={styles.hamburgerButton}
                    >
                        {topLeftShowsBack ? (
                            <>
                                <View
                                    style={[
                                        styles.chevronBar,
                                        styles.backBarTop,
                                    ]}
                                />
                                <View
                                    style={[
                                        styles.chevronBar,
                                        styles.backBarBottom,
                                    ]}
                                />
                            </>
                        ) : sidebarOpen ? (
                            <>
                                <View
                                    style={[
                                        styles.chevronBar,
                                        styles.chevronBarTop,
                                    ]}
                                />
                                <View
                                    style={[
                                        styles.chevronBar,
                                        styles.chevronBarBottom,
                                    ]}
                                />
                            </>
                        ) : (
                            <>
                                <View style={styles.hamburgerLine} />
                                <View style={styles.hamburgerLine} />
                                <View style={styles.hamburgerLine} />
                            </>
                        )}
                    </Pressable>
                </View>
            </Animated.View>

            {sidebarOpen && (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.backdrop,
                        {
                            bottom: -insets.bottom,
                            opacity: backdropOpacity,
                            top: -insets.top,
                        },
                    ]}
                />
            )}
            {sidebarOpen && (
                <Pressable
                    onPress={closeSidebar}
                    style={[
                        styles.backdropPressable,
                        { bottom: -insets.bottom, top: -insets.top },
                    ]}
                />
            )}

            <Animated.View
                style={[
                    styles.sidebarDrawer,
                    {
                        bottom: -insets.bottom,
                        paddingBottom: insets.bottom,
                        paddingTop: insets.top,
                        top: -insets.top,
                        transform: [{ translateX: sidebarX }],
                    },
                ]}
            >
                {/**
                 * Channel pane shows channels for the currently active server.
                 */}
                <ServerSidebar
                    activeChannelId={activeChannelId}
                    activeDmUserId={activeDmUserId}
                    activeServerId={activeServerId}
                    authStatus={authStatus}
                    channels={
                        activeServerId ? (channels[activeServerId] ?? []) : []
                    }
                    currentServerName={
                        activeServerId
                            ? (servers[activeServerId]?.name ?? "Server")
                            : ""
                    }
                    onAddServer={() => {
                        closeSidebar();
                        navigationRef.navigate("App", {
                            screen: "AddServer",
                        });
                    }}
                    onSelectChannel={(channel) => {
                        if (!activeServerId) {
                            return;
                        }
                        closeSidebar();
                        setActiveChannelId(channel.channelID);
                        navigationRef.navigate("App", {
                            params: {
                                channelID: channel.channelID,
                                channelName: channel.name,
                                serverID: activeServerId,
                            },
                            screen: "Channel",
                        });
                    }}
                    onSelectDM={(user) => {
                        closeSidebar();
                        setActiveDmUserId(user.userID);
                        navigationRef.navigate("App", {
                            params: {
                                userID: user.userID,
                                username: user.username,
                            },
                            screen: "Conversation",
                        });
                    }}
                    onSelectHome={() => {
                        setActiveServerId(null);
                        setActiveDmUserId(null);
                        navigationRef.navigate("App", {
                            screen: "DMList",
                        });
                    }}
                    onSelectServer={(id) => {
                        setActiveServerId(id);
                        const serverChannels = channels[id] ?? [];
                        const ch = serverChannels[0];
                        if (ch) {
                            navigationRef.navigate("App", {
                                params: {
                                    channelID: ch.channelID,
                                    channelName: ch.name,
                                    serverID: id,
                                },
                                screen: "Channel",
                            });
                            setActiveChannelId(ch.channelID);
                        } else {
                            navigationRef.navigate("App", {
                                params: { serverID: id },
                                screen: "ChannelList",
                            });
                            setActiveChannelId(null);
                        }
                    }}
                    onSettings={() => {
                        closeSidebar();
                        navigationRef.navigate("App", {
                            screen: "Settings",
                        });
                    }}
                    safeAreaBottom={insets.bottom}
                    safeAreaTop={insets.top}
                />
            </Animated.View>
        </View>
    );
}

function ContentStack({
    initialRoute,
    onRouteChange,
}: {
    initialRoute: keyof AppStackParamList;
    onRouteChange: (
        route: keyof AppStackParamList,
        params?: AppStackParamList[keyof AppStackParamList],
    ) => void;
}) {
    const withFocus =
        (name: keyof AppStackParamList) =>
        ({ route }: { route: { params?: unknown } }) => ({
            focus: () => {
                onRouteChange(
                    name,
                    route.params as AppStackParamList[keyof AppStackParamList],
                );
            },
        });

    return (
        <Stack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{ headerShown: false }}
        >
            <Stack.Screen
                component={OnboardingEmptyScreen}
                listeners={withFocus("OnboardingEmpty")}
                name="OnboardingEmpty"
            />
            <Stack.Screen
                component={JoinGroupScreen}
                listeners={withFocus("JoinGroup")}
                name="JoinGroup"
            />
            <Stack.Screen
                component={AddServerScreen}
                listeners={withFocus("AddServer")}
                name="AddServer"
            />
            <Stack.Screen
                component={DMListScreen}
                listeners={withFocus("DMList")}
                name="DMList"
            />
            <Stack.Screen
                component={ConversationScreen}
                listeners={withFocus("Conversation")}
                name="Conversation"
            />
            <Stack.Screen
                component={ChannelListScreen}
                listeners={withFocus("ChannelList")}
                name="ChannelList"
            />
            <Stack.Screen
                component={ChannelScreen}
                listeners={withFocus("Channel")}
                name="Channel"
            />
            <Stack.Screen
                component={InviteScreen}
                listeners={withFocus("Invite")}
                name="Invite"
            />
            <Stack.Screen
                component={ServerSettingsScreen}
                listeners={withFocus("ServerSettings")}
                name="ServerSettings"
            />
            <Stack.Screen
                component={SettingsScreen}
                listeners={withFocus("Settings")}
                name="Settings"
            />
            <Stack.Screen
                component={SettingsSectionScreen}
                listeners={withFocus("SettingsSection")}
                name="SettingsSection"
            />
            <Stack.Screen
                component={PendingApprovalsScreen}
                listeners={withFocus("Devices")}
                name="Devices"
            />
            <Stack.Screen
                component={DeviceRequestsScreen}
                listeners={withFocus("DeviceRequests")}
                name="DeviceRequests"
            />
            <Stack.Screen
                component={DeviceDetailsScreen}
                listeners={withFocus("DeviceDetails")}
                name="DeviceDetails"
            />
            <Stack.Screen
                component={SessionDetailsScreen}
                listeners={withFocus("SessionDetails")}
                name="SessionDetails"
            />
        </Stack.Navigator>
    );
}

const styles = StyleSheet.create({
    backBarBottom: {
        transform: [
            { rotate: "-45deg" },
            { translateX: 1.3 },
            { translateY: -3.1 },
        ],
    },
    backBarTop: {
        transform: [
            { rotate: "45deg" },
            { translateX: 1.3 },
            { translateY: 3.1 },
        ],
    },
    backdrop: {
        backgroundColor: "rgba(0,0,0,0.32)",
        left: 0,
        position: "absolute",
        right: 0,
    },
    backdropPressable: {
        left: 0,
        position: "absolute",
        right: 0,
    },
    chevronBar: {
        backgroundColor: colors.text,
        borderRadius: 999,
        height: 2,
        position: "absolute",
        width: 11,
    },
    chevronBarBottom: {
        transform: [
            { rotate: "45deg" },
            { translateX: -1.3 },
            { translateY: -3.1 },
        ],
    },
    chevronBarTop: {
        transform: [
            { rotate: "-45deg" },
            { translateX: -1.3 },
            { translateY: 3.1 },
        ],
    },
    container: {
        backgroundColor: colors.bg,
        flex: 1,
    },
    content: {
        backgroundColor: colors.surfaceLight,
        flex: 1,
    },
    hamburgerButton: {
        alignItems: "center",
        flex: 1,
        height: 36,
        justifyContent: "center",
        width: 36,
    },
    hamburgerLine: {
        backgroundColor: colors.text,
        borderRadius: 999,
        height: 2,
        marginVertical: 1.5,
        width: 14,
    },
    sidebarDrawer: {
        left: 0,
        position: "absolute",
        top: 0,
        width: SIDEBAR_WIDTH,
    },
    toggleButtonFrame: {
        borderRadius: 12,
        height: 36,
        overflow: "hidden",
        width: 36,
    },
    toggleButtonFrameClosed: {
        backgroundColor: "rgba(17,17,19,0.92)",
        borderColor: "rgba(255,255,255,0.14)",
        borderWidth: 1,
    },
    toggleButtonFrameOpen: {
        backgroundColor: "rgba(9,9,11,0.98)",
        borderColor: "rgba(255,255,255,0.22)",
        borderWidth: 1,
    },
    toggleButtonWrap: {
        left: 0,
        position: "absolute",
        zIndex: 40,
    },
});

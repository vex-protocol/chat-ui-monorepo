import React from "react";

import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ChannelListScreen } from "../screens/ChannelListScreen";
import { ChannelScreen } from "../screens/ChannelScreen";
import { ServerListScreen } from "../screens/ServerListScreen";
import type { ServersStackParamList } from "./types";

const Stack = createNativeStackNavigator<ServersStackParamList>();

export function ServersStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: "#1a1a1a" },
                headerTintColor: "#e8e8e8",
            }}
        >
            <Stack.Screen
                component={ServerListScreen}
                name="ServerList"
                options={{ title: "Servers" }}
            />
            <Stack.Screen
                component={ChannelListScreen}
                name="ChannelList"
                options={({ route }) => ({
                    title: route.params?.serverName ?? "Channels",
                })}
            />
            <Stack.Screen
                component={ChannelScreen}
                name="Channel"
                options={({ route }) => ({
                    title: `#${route.params?.channelName ?? ""}`,
                })}
            />
        </Stack.Navigator>
    );
}

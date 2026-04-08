import React from "react";

import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ChannelListScreen } from "../screens/ChannelListScreen";
import { ChannelScreen } from "../screens/ChannelScreen";
import { ServerListScreen } from "../screens/ServerListScreen";

const Stack = createNativeStackNavigator();

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
                options={({ route }: { route: any }) => ({
                    title: route.params?.serverName ?? "Channels",
                })}
            />
            <Stack.Screen
                component={ChannelScreen}
                name="Channel"
                options={({ route }: { route: any }) => ({
                    title: `#${route.params?.channelName ?? ""}`,
                })}
            />
        </Stack.Navigator>
    );
}

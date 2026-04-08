import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ServerListScreen } from "../screens/ServerListScreen";
import { ChannelListScreen } from "../screens/ChannelListScreen";
import { ChannelScreen } from "../screens/ChannelScreen";

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
                name="ServerList"
                component={ServerListScreen}
                options={{ title: "Servers" }}
            />
            <Stack.Screen
                name="ChannelList"
                component={ChannelListScreen}
                options={({ route }: { route: any }) => ({
                    title: route.params?.serverName ?? "Channels",
                })}
            />
            <Stack.Screen
                name="Channel"
                component={ChannelScreen}
                options={({ route }: { route: any }) => ({
                    title: `#${route.params?.channelName ?? ""}`,
                })}
            />
        </Stack.Navigator>
    );
}

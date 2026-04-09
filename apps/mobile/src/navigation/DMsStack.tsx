import React from "react";

import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ConversationScreen } from "../screens/ConversationScreen";
import { DMListScreen } from "../screens/DMListScreen";
import type { DMsStackParamList } from "./types";

const Stack = createNativeStackNavigator<DMsStackParamList>();

export function DMsStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: "#1a1a1a" },
                headerTintColor: "#e8e8e8",
            }}
        >
            <Stack.Screen
                component={DMListScreen}
                name="DMList"
                options={{ title: "Messages" }}
            />
            <Stack.Screen
                component={ConversationScreen}
                name="Conversation"
                options={({ route }) => ({
                    title: `@${route.params?.username ?? ""}`,
                })}
            />
        </Stack.Navigator>
    );
}

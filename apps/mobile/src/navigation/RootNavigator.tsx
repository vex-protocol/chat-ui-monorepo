import type { RootStackParamList } from "./types";

import React from "react";

import { $user } from "@vex-chat/store";

import { useStore } from "@nanostores/react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AppTabs } from "./AppTabs";
import { AuthStack } from "./AuthStack";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
    const user = useStore($user);
    const isLoggedIn = user !== null;

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {isLoggedIn ? (
                <Stack.Screen component={AppTabs} name="App" />
            ) : (
                <Stack.Screen component={AuthStack} name="Auth" />
            )}
        </Stack.Navigator>
    );
}

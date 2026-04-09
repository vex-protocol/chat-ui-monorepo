import React, { useEffect, useState } from "react";

import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { loadCredentials } from "../lib/keychain";
import { AuthenticateScreen } from "../screens/AuthenticateScreen";
import { FinalizeScreen } from "../screens/FinalizeScreen";
import { HangTightScreen } from "../screens/HangTightScreen";
import { InitializeScreen } from "../screens/InitializeScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { WelcomeBackScreen } from "../screens/WelcomeBackScreen";
import { WelcomeScreen } from "../screens/WelcomeScreen";
import type { AuthStackParamList } from "./types";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
    const [initialRoute, setInitialRoute] = useState<
        "Welcome" | "WelcomeBack" | null
    >(null);

    useEffect(() => {
        loadCredentials().then((creds) => {
            setInitialRoute(creds ? "WelcomeBack" : "Welcome");
        });
    }, []);

    if (!initialRoute) return null; // brief wait while checking keychain

    return (
        <Stack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{ headerShown: false }}
        >
            <Stack.Screen component={WelcomeScreen} name="Welcome" />
            <Stack.Screen
                component={InitializeScreen}
                name="Initialize"
            />
            <Stack.Screen component={FinalizeScreen} name="Finalize" />
            <Stack.Screen component={HangTightScreen} name="HangTight" />
            <Stack.Screen
                component={WelcomeBackScreen}
                name="WelcomeBack"
            />
            <Stack.Screen
                component={AuthenticateScreen}
                name="Authenticate"
            />
            <Stack.Screen component={LoginScreen} name="Login" />
        </Stack.Navigator>
    );
}

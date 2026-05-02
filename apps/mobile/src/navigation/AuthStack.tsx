import type { AuthStackParamList } from "./types";

import React from "react";

import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AuthenticateScreen } from "../screens/AuthenticateScreen";
import { HangTightScreen } from "../screens/HangTightScreen";
import { WelcomeBackScreen } from "../screens/WelcomeBackScreen";
import { WelcomeScreen } from "../screens/WelcomeScreen";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
    return (
        <Stack.Navigator
            initialRouteName="HangTight"
            screenOptions={{ headerShown: false }}
        >
            <Stack.Screen component={WelcomeScreen} name="Welcome" />
            <Stack.Screen component={HangTightScreen} name="HangTight" />
            <Stack.Screen component={WelcomeBackScreen} name="WelcomeBack" />
            <Stack.Screen component={AuthenticateScreen} name="Authenticate" />
        </Stack.Navigator>
    );
}

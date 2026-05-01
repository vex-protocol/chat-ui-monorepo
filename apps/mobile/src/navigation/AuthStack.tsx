import type { AuthStackParamList } from "./types";

import React from "react";

import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AuthenticateScreen } from "../screens/AuthenticateScreen";
import { FinalizeScreen } from "../screens/FinalizeScreen";
import { HangTightScreen } from "../screens/HangTightScreen";
import { InitializeScreen } from "../screens/InitializeScreen";
import { LoginScreen } from "../screens/LoginScreen";
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
            <Stack.Screen component={InitializeScreen} name="Initialize" />
            <Stack.Screen component={FinalizeScreen} name="Finalize" />
            <Stack.Screen component={HangTightScreen} name="HangTight" />
            <Stack.Screen component={WelcomeBackScreen} name="WelcomeBack" />
            <Stack.Screen component={AuthenticateScreen} name="Authenticate" />
            <Stack.Screen component={LoginScreen} name="Login" />
        </Stack.Navigator>
    );
}

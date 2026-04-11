import React, { useEffect, useRef } from "react";
import { StatusBar } from "react-native";

import {
    $groupMessages,
    $keyReplaced,
    $messages,
    vexService,
} from "@vex-chat/store";

import { useStore } from "@nanostores/react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { getServerOptions } from "./src/lib/config";
import { clearCredentials, keychainKeyStore } from "./src/lib/keychain";
import {
    requestNotificationPermission,
    setupNotificationHandlers,
    showMessageNotification,
} from "./src/lib/notifications";
import { mobileConfig } from "./src/lib/platform";
import { navigationRef } from "./src/navigation/navigationRef";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { colors, fontFamilies } from "./src/theme";

function App() {
    const keyReplaced = useStore($keyReplaced);

    useEffect(() => {
        const unsubNotif = setupNotificationHandlers();
        return () => {
            unsubNotif();
        };
    }, []);

    useEffect(() => {
        void (async () => {
            await requestNotificationPermission();
            await vexService.autoLogin(
                keychainKeyStore,
                mobileConfig(),
                getServerOptions(),
            );
            // Familiars are populated by vexService.populateState() during bootstrap
        })();
    }, []);

    // Show local notifications for incoming messages by watching atom changes
    const allDms = useStore($messages);
    const allGroups = useStore($groupMessages);
    const prevDmsRef = useRef(allDms);
    const prevGroupsRef = useRef(allGroups);

    useEffect(() => {
        const prev = prevDmsRef.current;
        prevDmsRef.current = allDms;
        for (const [threadID, thread] of Object.entries(allDms)) {
            const prevThread = prev[threadID] ?? [];
            if (thread.length > prevThread.length) {
                const newMsg = thread[thread.length - 1];
                if (newMsg) void showMessageNotification(newMsg);
            }
        }
    }, [allDms]);

    useEffect(() => {
        const prev = prevGroupsRef.current;
        prevGroupsRef.current = allGroups;
        for (const [channelID, thread] of Object.entries(allGroups)) {
            const prevThread = prev[channelID] ?? [];
            if (thread.length > prevThread.length) {
                const newMsg = thread[thread.length - 1];
                if (newMsg) void showMessageNotification(newMsg);
            }
        }
    }, [allGroups]);

    useEffect(() => {
        if (keyReplaced) {
            // Key was replaced server-side — clear stored credentials and force re-auth
            void clearCredentials();
            // Navigation auto-redirects to Auth via $user becoming null
        }
    }, [keyReplaced]);

    return (
        <SafeAreaProvider>
            <StatusBar barStyle="light-content" />
            <NavigationContainer
                ref={navigationRef}
                theme={{
                    colors: {
                        background: colors.bg,
                        border: colors.borderSubtle,
                        card: colors.card,
                        notification: colors.error,
                        primary: colors.accentMuted,
                        text: colors.textSecondary,
                    },
                    dark: true,
                    fonts: {
                        bold: {
                            fontFamily: fontFamilies.heading,
                            fontWeight: "500",
                        },
                        heavy: {
                            fontFamily: fontFamilies.heading,
                            fontWeight: "500",
                        },
                        medium: {
                            fontFamily: fontFamilies.body,
                            fontWeight: "500",
                        },
                        regular: {
                            fontFamily: fontFamilies.mono,
                            fontWeight: "300",
                        },
                    },
                }}
            >
                <RootNavigator />
            </NavigationContainer>
        </SafeAreaProvider>
    );
}

export default App;

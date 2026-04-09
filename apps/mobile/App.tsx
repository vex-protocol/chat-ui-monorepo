import React, { useEffect, useRef } from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { useStore } from "@nanostores/react";
import {
    vexService,
    $keyReplaced,
    $user,
    $messages,
    $groupMessages,
} from "@vex-chat/store";
import { keychainKeyStore, clearCredentials } from "./src/lib/keychain";
import { getServerOptions } from "./src/lib/config";
import { mobileConfig } from "./src/lib/platform";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { navigationRef } from "./src/navigation/navigationRef";
import {
    requestNotificationPermission,
    showMessageNotification,
    setupNotificationHandlers,
} from "./src/lib/notifications";
import { colors, fontFamilies } from "./src/theme";

function App() {
    const keyReplaced = useStore($keyReplaced);
    const user = useStore($user);

    useEffect(() => {
        const unsubNotif = setupNotificationHandlers();
        return () => {
            unsubNotif();
        };
    }, []);

    useEffect(() => {
        (async () => {
            await requestNotificationPermission();
            await vexService.autoLogin(keychainKeyStore, mobileConfig(), getServerOptions());
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
                if (newMsg) showMessageNotification(newMsg);
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
                if (newMsg) showMessageNotification(newMsg);
            }
        }
    }, [allGroups]);

    useEffect(() => {
        if (keyReplaced) {
            // Key was replaced server-side — clear stored credentials and force re-auth
            clearCredentials();
            // Navigation auto-redirects to Auth via $user becoming null
        }
    }, [keyReplaced]);

    return (
        <SafeAreaProvider>
            <StatusBar barStyle="light-content" />
            <NavigationContainer
                ref={navigationRef}
                theme={{
                    dark: true,
                    colors: {
                        primary: colors.accentMuted,
                        background: colors.bg,
                        card: colors.card,
                        text: colors.textSecondary,
                        border: colors.borderSubtle,
                        notification: colors.error,
                    },
                    fonts: {
                        regular: {
                            fontFamily: fontFamilies.mono,
                            fontWeight: "300",
                        },
                        medium: {
                            fontFamily: fontFamilies.body,
                            fontWeight: "500",
                        },
                        bold: {
                            fontFamily: fontFamilies.heading,
                            fontWeight: "500",
                        },
                        heavy: {
                            fontFamily: fontFamilies.heading,
                            fontWeight: "500",
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

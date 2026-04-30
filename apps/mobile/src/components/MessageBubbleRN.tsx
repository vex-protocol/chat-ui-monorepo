import type { Message } from "@vex-chat/libvex";

import React from "react";
import {
    Alert,
    Clipboard,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { avatarHue, formatTime } from "@vex-chat/store";

import { colors, typography } from "../theme";

interface MessageBubbleRNProps {
    authorName: string;
    isOwn: boolean;
    message: Message;
    onDeleteMessage?: (message: Message) => void;
    showIdentity?: boolean;
}

export function MessageBubbleRN({
    authorName,
    isOwn,
    message,
    onDeleteMessage,
    showIdentity = true,
}: MessageBubbleRNProps) {
    const handleLongPress = () => {
        const buttons = [
            {
                onPress: () => {
                    // eslint-disable-next-line @typescript-eslint/no-deprecated -- RN Clipboard is the supported API on bare app
                    Clipboard.setString(message.message);
                },
                text: "Copy text",
            },
        ];
        if (onDeleteMessage) {
            buttons.push({
                onPress: () => {
                    onDeleteMessage(message);
                },
                style: "destructive",
                text: "Delete message",
            });
        }
        buttons.push({ style: "cancel", text: "Cancel" });
        Alert.alert("Message options", undefined, buttons);
    };

    if (message.group === "__system__") {
        return (
            <Pressable onLongPress={handleLongPress}>
                <View style={styles.systemContainer}>
                    <Text selectable style={styles.systemText}>
                        {message.message}
                    </Text>
                </View>
            </Pressable>
        );
    }

    return (
        <Pressable onLongPress={handleLongPress}>
            <View
                style={[
                    styles.container,
                    !showIdentity && styles.containerGrouped,
                ]}
            >
                {showIdentity ? (
                    <View
                        style={[
                            styles.avatar,
                            {
                                backgroundColor: `hsl(${avatarHue(message.authorID)}, 45%, 40%)`,
                            },
                        ]}
                    >
                        <Text style={styles.avatarText}>
                            {authorName.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.avatarSpacer} />
                )}

                <View style={styles.content}>
                    {showIdentity && (
                        <View style={styles.meta}>
                            <Text
                                style={[
                                    styles.author,
                                    isOwn && styles.authorSelf,
                                ]}
                            >
                                {authorName}
                            </Text>
                            <Text style={styles.timestamp}>
                                {formatTime(message.timestamp)}
                            </Text>
                        </View>
                    )}
                    <Text
                        selectable
                        style={[
                            styles.text,
                            !showIdentity && styles.textGrouped,
                        ]}
                    >
                        {message.message}
                    </Text>
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    author: {
        ...typography.body,
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: "600",
    },
    authorSelf: {
        color: colors.accentMuted,
    },
    avatar: {
        alignItems: "center",
        borderRadius: 16,
        height: 32,
        justifyContent: "center",
        marginTop: 2,
        width: 32,
    },
    avatarSpacer: {
        width: 32,
    },
    avatarText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "700",
    },
    container: {
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    containerGrouped: {
        paddingVertical: 2,
    },
    content: {
        flex: 1,
    },
    meta: {
        alignItems: "center",
        flexDirection: "row",
        gap: 8,
        marginBottom: 2,
    },
    systemContainer: {
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    systemText: {
        ...typography.body,
        color: colors.muted,
        fontSize: 12,
        fontStyle: "italic",
    },
    text: {
        ...typography.bodyLarge,
        color: colors.textSecondary,
    },
    textGrouped: {
        marginTop: 1,
    },
    timestamp: {
        ...typography.body,
        color: colors.muted,
        fontSize: 10,
    },
});

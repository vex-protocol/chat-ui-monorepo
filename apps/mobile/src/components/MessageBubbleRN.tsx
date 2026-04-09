import type { Message } from "@vex-chat/libvex";

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { avatarHue, formatTime } from "@vex-chat/store";

import { colors, typography } from "../theme";

interface MessageBubbleRNProps {
    authorName: string;
    isOwn: boolean;
    message: Message;
}

export function MessageBubbleRN({
    authorName,
    isOwn,
    message,
}: MessageBubbleRNProps) {
    if (message.group === "__system__") {
        return (
            <View style={styles.systemContainer}>
                <Text style={styles.systemText}>{message.message}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Avatar */}
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

            {/* Content */}
            <View style={styles.content}>
                <View style={styles.meta}>
                    <Text style={[styles.author, isOwn && styles.authorSelf]}>
                        {authorName}
                    </Text>
                    <Text style={styles.timestamp}>
                        {formatTime(message.timestamp)}
                    </Text>
                </View>
                <Text style={styles.text}>{message.message}</Text>
            </View>
        </View>
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
    timestamp: {
        ...typography.body,
        color: colors.muted,
        fontSize: 10,
    },
});

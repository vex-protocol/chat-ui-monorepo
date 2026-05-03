import type { Message } from "@vex-chat/libvex";
import type { GestureResponderEvent } from "react-native";

import React from "react";
import {
    Clipboard,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";

import { formatTime } from "@vex-chat/store";

import { colors, typography } from "../theme";

import { Avatar } from "./Avatar";

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
    const { height: windowHeight, width: windowWidth } = useWindowDimensions();
    const [menuOpen, setMenuOpen] = React.useState(false);
    const [menuX, setMenuX] = React.useState(0);
    const [menuY, setMenuY] = React.useState(0);

    const menuActions = React.useMemo(
        () => [
            {
                id: "copy",
                label: "Copy text",
                onPress: () => {
                    // eslint-disable-next-line @typescript-eslint/no-deprecated -- RN Clipboard is the supported API on bare app
                    Clipboard.setString(message.message);
                },
                tone: "default" as const,
            },
            ...(onDeleteMessage
                ? [
                      {
                          id: "delete",
                          label: "Delete message",
                          onPress: () => {
                              onDeleteMessage(message);
                          },
                          tone: "destructive" as const,
                      },
                  ]
                : []),
        ],
        [message, onDeleteMessage],
    );

    const openContextMenuAt = (x: number, y: number) => {
        setMenuX(x);
        setMenuY(y);
        setMenuOpen(true);
    };

    const handlePressIn = (event: GestureResponderEvent) => {
        if (event.nativeEvent.button === 2) {
            openContextMenuAt(event.nativeEvent.pageX, event.nativeEvent.pageY);
        }
    };

    const estimatedMenuHeight = menuActions.length * 44 + 12;
    const estimatedMenuWidth = 220;
    const maxLeft = Math.max(8, windowWidth - estimatedMenuWidth - 8);
    const maxTop = Math.max(8, windowHeight - estimatedMenuHeight - 8);
    const clampedLeft = clamp(menuX, 8, maxLeft);
    const clampedTop = clamp(menuY, 8, maxTop);

    const renderContextMenu = () => (
        <Modal
            animationType="none"
            onRequestClose={() => setMenuOpen(false)}
            transparent
            visible={menuOpen}
        >
            <Pressable
                onPress={() => {
                    setMenuOpen(false);
                }}
                style={styles.menuBackdrop}
            >
                <View
                    style={[
                        styles.menuCard,
                        { left: clampedLeft, top: clampedTop },
                    ]}
                >
                    {menuActions.map((action, index) => (
                        <Pressable
                            key={action.id}
                            onPress={() => {
                                setMenuOpen(false);
                                action.onPress();
                            }}
                            style={({ pressed }) => [
                                styles.menuItem,
                                index > 0 && styles.menuItemDivider,
                                pressed && styles.menuItemPressed,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.menuText,
                                    action.tone === "destructive" &&
                                        styles.menuTextDestructive,
                                ]}
                            >
                                {action.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </Pressable>
        </Modal>
    );

    if (message.group === "__system__") {
        return (
            <>
                {renderContextMenu()}
                <Pressable
                    onLongPress={(event) => {
                        openContextMenuAt(
                            event.nativeEvent.pageX,
                            event.nativeEvent.pageY,
                        );
                    }}
                    onPressIn={handlePressIn}
                >
                    <View style={styles.systemContainer}>
                        <Text style={styles.systemText}>{message.message}</Text>
                    </View>
                </Pressable>
            </>
        );
    }

    return (
        <>
            {renderContextMenu()}
            <Pressable
                onLongPress={(event) => {
                    openContextMenuAt(
                        event.nativeEvent.pageX,
                        event.nativeEvent.pageY,
                    );
                }}
                onPressIn={handlePressIn}
            >
                <View
                    style={[
                        styles.container,
                        !showIdentity && styles.containerGrouped,
                    ]}
                >
                    {showIdentity ? (
                        <Avatar
                            displayName={authorName}
                            size={32}
                            userID={message.authorID}
                        />
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
        </>
    );
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
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
    avatarSpacer: {
        width: 32,
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
    menuBackdrop: {
        ...StyleSheet.absoluteFill,
    },
    menuCard: {
        backgroundColor: "#11141C",
        borderColor: "rgba(255,255,255,0.12)",
        borderRadius: 12,
        borderWidth: 1,
        elevation: 12,
        minWidth: 190,
        overflow: "hidden",
        position: "absolute",
        shadowColor: "#000",
        shadowOffset: { height: 8, width: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 18,
    },
    menuItem: {
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    menuItemDivider: {
        borderTopColor: "rgba(255,255,255,0.08)",
        borderTopWidth: 1,
    },
    menuItemPressed: {
        backgroundColor: "rgba(255,255,255,0.06)",
    },
    menuText: {
        ...typography.body,
        color: "#E8EBF3",
        fontSize: 14,
    },
    menuTextDestructive: {
        color: "#FF7A7A",
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

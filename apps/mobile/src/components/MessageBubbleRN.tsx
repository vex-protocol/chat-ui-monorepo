import type { Message } from "@vex-chat/libvex";
import type {
    EncryptedFileAttachment,
    MarkdownInlineSegment,
    MessageMarkdownNode,
} from "@vex-chat/store";
import type { GestureResponderEvent, TextStyle } from "react-native";

import React from "react";
import {
    ActivityIndicator,
    Alert,
    Clipboard,
    Image,
    Linking,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";

import {
    applyEmoji,
    extractInviteID,
    formatFileSize,
    formatTime,
    isImageType,
    parseMessageMarkdown,
    vexService,
} from "@vex-chat/store";

import { Ionicons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";

import { bytesToBase64, writeAttachmentToCache } from "../lib/attachments";
import { colors, fontFamilies, typography } from "../theme";

import { Avatar } from "./Avatar";
import { InvitePreviewCard } from "./InvitePreviewCard";

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
    const inviteID = React.useMemo(
        () => extractInviteID(message.message),
        [message.message],
    );
    const markdownNodes = React.useMemo(
        () => parseMessageMarkdown(message.message),
        [message.message],
    );

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
        const maybeMouseEvent = event.nativeEvent as { button?: number };
        if (maybeMouseEvent.button === 2) {
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
                        <MarkdownMessage
                            grouped={!showIdentity}
                            nodes={markdownNodes}
                        />
                        {inviteID ? (
                            <InvitePreviewCard
                                inviteID={inviteID}
                                isOwn={isOwn}
                            />
                        ) : null}
                    </View>
                </View>
            </Pressable>
        </>
    );
}

function AttachmentPreview({
    attachment,
    image,
}: {
    attachment: EncryptedFileAttachment;
    image: boolean;
}) {
    const shouldRenderImage = image || isImageType(attachment.contentType);
    const [error, setError] = React.useState("");
    const [imageUri, setImageUri] = React.useState<null | string>(null);
    const [opening, setOpening] = React.useState(false);
    const [previewLoading, setPreviewLoading] = React.useState(false);

    React.useEffect(() => {
        if (!shouldRenderImage) {
            setImageUri(null);
            setPreviewLoading(false);
            setError("");
            return;
        }

        let cancelled = false;
        setImageUri(null);
        setPreviewLoading(true);
        setError("");
        void fetchAttachmentData(attachment)
            .then((data) => {
                if (cancelled) return;
                setImageUri(
                    `data:${attachment.contentType};base64,${bytesToBase64(
                        data,
                    )}`,
                );
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                setError(
                    err instanceof Error ? err.message : "Could not load file",
                );
            })
            .finally(() => {
                if (!cancelled) {
                    setPreviewLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [attachment, shouldRenderImage]);

    const openAttachment = React.useCallback(async () => {
        if (opening) return;
        setOpening(true);
        setError("");
        try {
            const data = await fetchAttachmentData(attachment);
            const uri = await writeAttachmentToCache(attachment, data);
            const available = await Sharing.isAvailableAsync();
            if (!available) {
                Alert.alert("Downloaded", attachment.fileName);
                return;
            }
            await Sharing.shareAsync(uri, {
                dialogTitle: attachment.fileName,
                mimeType: attachment.contentType,
            });
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : "Could not open file";
            setError(message);
            Alert.alert("Could not open file", message);
        } finally {
            setOpening(false);
        }
    }, [attachment, opening]);

    if (shouldRenderImage) {
        return (
            <Pressable
                accessibilityRole="button"
                onPress={() => void openAttachment()}
                style={({ pressed }) => [
                    styles.imageAttachment,
                    pressed && styles.attachmentPressed,
                ]}
            >
                {previewLoading ? (
                    <View style={styles.imageLoading}>
                        <ActivityIndicator
                            color={colors.textSecondary}
                            size="small"
                        />
                    </View>
                ) : imageUri ? (
                    <Image
                        resizeMode="cover"
                        source={{ uri: imageUri }}
                        style={styles.imageAttachmentMedia}
                    />
                ) : (
                    <View style={styles.imageLoading}>
                        <Ionicons
                            color={colors.muted}
                            name="image-outline"
                            size={24}
                        />
                        <Text numberOfLines={2} style={styles.attachmentError}>
                            {error || "Image unavailable"}
                        </Text>
                    </View>
                )}
                <View style={styles.attachmentCaption}>
                    <Text numberOfLines={1} style={styles.attachmentName}>
                        {attachment.fileName}
                    </Text>
                    <Text style={styles.attachmentSize}>
                        {formatFileSize(attachment.fileSize)}
                    </Text>
                </View>
            </Pressable>
        );
    }

    return (
        <Pressable
            accessibilityRole="button"
            onPress={() => void openAttachment()}
            style={({ pressed }) => [
                styles.fileAttachment,
                pressed && styles.attachmentPressed,
            ]}
        >
            <View style={styles.fileAttachmentIcon}>
                {opening ? (
                    <ActivityIndicator
                        color={colors.textSecondary}
                        size="small"
                    />
                ) : (
                    <Ionicons
                        color={colors.textSecondary}
                        name="document-text-outline"
                        size={20}
                    />
                )}
            </View>
            <View style={styles.fileAttachmentMeta}>
                <Text numberOfLines={1} style={styles.attachmentName}>
                    {attachment.fileName}
                </Text>
                <Text style={styles.attachmentSize}>
                    {formatFileSize(attachment.fileSize)}
                </Text>
                {error ? (
                    <Text numberOfLines={1} style={styles.attachmentError}>
                        {error}
                    </Text>
                ) : null}
            </View>
            <Ionicons color={colors.muted} name="download-outline" size={18} />
        </Pressable>
    );
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

async function fetchAttachmentData(
    attachment: EncryptedFileAttachment,
): Promise<Uint8Array> {
    const result = await vexService.downloadFileAttachment(attachment);
    if (!result.ok || !result.data) {
        throw new Error(result.error ?? "Could not download file");
    }
    return result.data;
}

function inlineSegmentStyle(segment: MarkdownInlineSegment): null | TextStyle {
    switch (segment.type) {
        case "code":
            return styles.inlineCode;
        case "emphasis":
            return styles.inlineEmphasis;
        case "link":
            return styles.inlineLink;
        case "strong":
            return styles.inlineStrong;
        case "text":
            return null;
    }
}

function MarkdownMessage({
    grouped,
    nodes,
}: {
    grouped: boolean;
    nodes: MessageMarkdownNode[];
}) {
    return (
        <View style={styles.markdownStack}>
            {nodes.map((node, index) => {
                if (node.type === "text") {
                    return (
                        <MarkdownText
                            grouped={grouped && index === 0}
                            key={`text-${String(index)}`}
                            segments={node.segments}
                        />
                    );
                }
                return (
                    <AttachmentPreview
                        attachment={node.attachment}
                        image={node.image}
                        key={`${node.attachment.fileID}-${String(index)}`}
                    />
                );
            })}
        </View>
    );
}

function MarkdownText({
    grouped,
    segments,
}: {
    grouped: boolean;
    segments: MarkdownInlineSegment[];
}) {
    return (
        <Text style={[styles.text, grouped && styles.textGrouped]}>
            {segments.map((segment, index) => (
                <Text
                    key={`${segment.type}-${String(index)}`}
                    onPress={
                        segment.type === "link"
                            ? () => {
                                  void Linking.openURL(segment.url).catch(
                                      () => {
                                          Alert.alert(
                                              "Could not open link",
                                              segment.url,
                                          );
                                      },
                                  );
                              }
                            : undefined
                    }
                    style={inlineSegmentStyle(segment)}
                >
                    {segment.type === "code"
                        ? segment.text
                        : applyEmoji(segment.text)}
                </Text>
            ))}
        </Text>
    );
}

const styles = StyleSheet.create({
    attachmentCaption: {
        backgroundColor: "rgba(0,0,0,0.62)",
        bottom: 0,
        gap: 1,
        left: 0,
        paddingHorizontal: 10,
        paddingVertical: 7,
        position: "absolute",
        right: 0,
    },
    attachmentError: {
        ...typography.body,
        color: colors.error,
        fontSize: 11,
    },
    attachmentName: {
        ...typography.body,
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: "600",
    },
    attachmentPressed: {
        opacity: 0.82,
    },
    attachmentSize: {
        ...typography.body,
        color: colors.muted,
        fontSize: 11,
    },
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
    fileAttachment: {
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.045)",
        borderColor: "rgba(255,255,255,0.1)",
        borderRadius: 8,
        borderWidth: 1,
        flexDirection: "row",
        gap: 10,
        marginTop: 6,
        maxWidth: 360,
        padding: 10,
    },
    fileAttachmentIcon: {
        alignItems: "center",
        backgroundColor: colors.input,
        borderColor: colors.borderSubtle,
        borderRadius: 6,
        borderWidth: 1,
        height: 38,
        justifyContent: "center",
        width: 38,
    },
    fileAttachmentMeta: {
        flex: 1,
        minWidth: 0,
    },
    imageAttachment: {
        backgroundColor: colors.input,
        borderColor: "rgba(255,255,255,0.1)",
        borderRadius: 8,
        borderWidth: 1,
        height: 220,
        marginTop: 6,
        maxWidth: 360,
        overflow: "hidden",
        width: "100%",
    },
    imageAttachmentMedia: {
        height: "100%",
        width: "100%",
    },
    imageLoading: {
        alignItems: "center",
        flex: 1,
        gap: 8,
        justifyContent: "center",
        padding: 16,
    },
    inlineCode: {
        backgroundColor: "rgba(255,255,255,0.08)",
        color: colors.textSecondary,
        fontFamily: fontFamilies.mono,
    },
    inlineEmphasis: {
        fontStyle: "italic",
    },
    inlineLink: {
        color: "#8AB4FF",
        textDecorationLine: "underline",
    },
    inlineStrong: {
        fontWeight: "700",
    },
    markdownStack: {
        gap: 2,
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

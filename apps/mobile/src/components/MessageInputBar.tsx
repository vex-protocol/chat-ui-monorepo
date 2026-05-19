import React, { useRef } from "react";
import {
    Image,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { formatFileSize, isImageType } from "@vex-chat/store";

import { Ionicons } from "@expo/vector-icons";

import { haptic } from "../lib/haptics";
import { colors } from "../theme";

interface ComposerAttachment {
    contentType: string;
    fileName: string;
    fileSize: number;
    previewUri?: string | undefined;
}

interface MessageInputBarProps {
    attachment?: ComposerAttachment | null | undefined;
    bottomInset?: number;
    onAttachPress?: (() => void) | undefined;
    onChangeText: (text: string) => void;
    onPastePress?: (() => void) | undefined;
    onRemoveAttachment?: (() => void) | undefined;
    onSend: () => void;
    placeholder?: string;
    sending?: boolean;
    value: string;
}

export function MessageInputBar({
    attachment = null,
    bottomInset = 0,
    onAttachPress,
    onChangeText,
    onPastePress,
    onRemoveAttachment,
    onSend,
    placeholder = "Message...",
    sending = false,
    value,
}: MessageInputBarProps) {
    const canSend = (value.trim().length > 0 || attachment != null) && !sending;
    const inputRef = useRef<TextInput>(null);
    const keepFocusAfterSubmitRef = useRef(false);
    const handleSubmitEditing = () => {
        if (canSend) {
            haptic("confirm");
            keepFocusAfterSubmitRef.current = true;
            onSend();
        }
        // Keep chat composer focused after pressing Enter/Send.
        setTimeout(() => {
            inputRef.current?.focus();
            keepFocusAfterSubmitRef.current = false;
        }, 0);
    };

    return (
        <View
            style={[
                styles.container,
                Platform.OS === "ios"
                    ? { paddingBottom: 8 + Math.max(0, bottomInset - 2) }
                    : null,
            ]}
        >
            {attachment ? (
                <View style={styles.attachmentPreview}>
                    {attachment.previewUri &&
                    isImageType(attachment.contentType) ? (
                        <Image
                            source={{ uri: attachment.previewUri }}
                            style={styles.attachmentImage}
                        />
                    ) : (
                        <View style={styles.attachmentIconBox}>
                            <Ionicons
                                color={colors.muted}
                                name="document-text-outline"
                                size={18}
                            />
                        </View>
                    )}
                    <View style={styles.attachmentMeta}>
                        <Text numberOfLines={1} style={styles.attachmentName}>
                            {attachment.fileName}
                        </Text>
                        <Text style={styles.attachmentSize}>
                            {formatFileSize(attachment.fileSize)}
                        </Text>
                    </View>
                    <TouchableOpacity
                        accessibilityRole="button"
                        onPress={onRemoveAttachment}
                        style={styles.removeAttachmentBtn}
                    >
                        <Ionicons
                            color={colors.textSecondary}
                            name="close"
                            size={18}
                        />
                    </TouchableOpacity>
                </View>
            ) : null}

            <View style={styles.inputRow}>
                <TouchableOpacity
                    accessibilityRole="button"
                    disabled={sending}
                    onPress={() => {
                        haptic("selection");
                        onAttachPress?.();
                    }}
                    style={[
                        styles.actionBtn,
                        sending && styles.actionBtnDisabled,
                    ]}
                >
                    <Ionicons
                        color={colors.muted}
                        name="attach-outline"
                        size={20}
                    />
                </TouchableOpacity>

                {onPastePress ? (
                    <TouchableOpacity
                        accessibilityLabel="Paste image from clipboard"
                        accessibilityRole="button"
                        disabled={sending}
                        onPress={() => {
                            haptic("selection");
                            onPastePress();
                        }}
                        style={[
                            styles.actionBtn,
                            sending && styles.actionBtnDisabled,
                        ]}
                    >
                        <Ionicons
                            color={colors.muted}
                            name="clipboard-outline"
                            size={19}
                        />
                    </TouchableOpacity>
                ) : null}

                <TextInput
                    multiline
                    onBlur={() => {
                        if (!keepFocusAfterSubmitRef.current) return;
                        requestAnimationFrame(() => {
                            inputRef.current?.focus();
                        });
                    }}
                    onChangeText={onChangeText}
                    onSubmitEditing={handleSubmitEditing}
                    placeholder={placeholder}
                    placeholderTextColor={colors.mutedDark}
                    ref={inputRef}
                    returnKeyType="send"
                    style={styles.input}
                    submitBehavior="submit"
                    value={value}
                />

                <TouchableOpacity
                    disabled={!canSend}
                    onPress={() => {
                        haptic("confirm");
                        onSend();
                    }}
                    style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
                >
                    <Ionicons color={colors.text} name="arrow-up" size={18} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    actionBtn: {
        alignItems: "center",
        borderColor: colors.border,
        borderRadius: 18,
        borderWidth: 1,
        height: 36,
        justifyContent: "center",
        width: 36,
    },
    actionBtnDisabled: {
        opacity: 0.45,
    },
    attachmentIconBox: {
        alignItems: "center",
        backgroundColor: colors.input,
        borderColor: colors.borderSubtle,
        borderWidth: 1,
        height: 42,
        justifyContent: "center",
        width: 42,
    },
    attachmentImage: {
        backgroundColor: colors.input,
        height: 42,
        width: 42,
    },
    attachmentMeta: {
        flex: 1,
        minWidth: 0,
    },
    attachmentName: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: "600",
    },
    attachmentPreview: {
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.04)",
        borderColor: colors.borderSubtle,
        borderWidth: 1,
        flexDirection: "row",
        gap: 10,
        padding: 8,
    },
    attachmentSize: {
        color: colors.muted,
        fontSize: 11,
    },
    container: {
        backgroundColor: colors.surface,
        borderTopColor: colors.borderSubtle,
        borderTopWidth: 1,
        gap: 8,
        padding: 8,
    },
    input: {
        backgroundColor: colors.input,
        borderColor: colors.borderSubtle,
        borderWidth: 1,
        color: colors.textSecondary,
        flex: 1,
        fontSize: 14,
        maxHeight: 100,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    inputRow: {
        alignItems: "flex-end",
        flexDirection: "row",
        gap: 8,
    },
    removeAttachmentBtn: {
        alignItems: "center",
        borderColor: colors.borderSubtle,
        borderWidth: 1,
        height: 32,
        justifyContent: "center",
        width: 32,
    },
    sendBtn: {
        alignItems: "center",
        backgroundColor: colors.accent,
        borderRadius: 18,
        height: 36,
        justifyContent: "center",
        width: 36,
    },
    sendBtnDisabled: {
        opacity: 0.4,
    },
});

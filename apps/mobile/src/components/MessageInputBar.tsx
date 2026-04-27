import React, { useRef } from "react";
import {
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { colors } from "../theme";

interface MessageInputBarProps {
    bottomInset?: number;
    onChangeText: (text: string) => void;
    onSend: () => void;
    placeholder?: string;
    sending?: boolean;
    value: string;
}

export function MessageInputBar({
    bottomInset = 0,
    onChangeText,
    onSend,
    placeholder = "Message...",
    sending = false,
    value,
}: MessageInputBarProps) {
    const canSend = value.trim().length > 0 && !sending;
    const inputRef = useRef<TextInput>(null);
    const keepFocusAfterSubmitRef = useRef(false);
    const handleSubmitEditing = () => {
        if (canSend) {
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
            <TouchableOpacity style={styles.actionBtn}>
                <Text style={styles.actionIcon}>+</Text>
            </TouchableOpacity>

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
                onPress={onSend}
                style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            >
                <Text style={styles.sendText}>→</Text>
            </TouchableOpacity>
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
    actionIcon: {
        color: colors.muted,
        fontSize: 18,
    },
    container: {
        alignItems: "flex-end",
        backgroundColor: colors.surface,
        borderTopColor: colors.borderSubtle,
        borderTopWidth: 1,
        flexDirection: "row",
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
    sendText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: "700",
    },
});

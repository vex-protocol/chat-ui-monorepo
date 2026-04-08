import React from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { colors } from "../theme";

interface MessageInputBarProps {
    onChangeText: (text: string) => void;
    onSend: () => void;
    placeholder?: string;
    sending?: boolean;
    value: string;
}

export function MessageInputBar({
    onChangeText,
    onSend,
    placeholder = "Message...",
    sending = false,
    value,
}: MessageInputBarProps) {
    const canSend = value.trim().length > 0 && !sending;

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.actionBtn}>
                <Text style={styles.actionIcon}>+</Text>
            </TouchableOpacity>

            <TextInput
                editable={!sending}
                multiline
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={colors.mutedDark}
                style={styles.input}
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

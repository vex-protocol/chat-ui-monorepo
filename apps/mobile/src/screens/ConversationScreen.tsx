import type { AppScreenProps } from "../navigation/types";
import type { Message } from "@vex-chat/libvex";

import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { $messages, $user, vexService } from "@vex-chat/store";

import { useStore } from "@nanostores/react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatHeader } from "../components/ChatHeader";
import { MessageBubbleRN } from "../components/MessageBubbleRN";
import { MessageInputBar } from "../components/MessageInputBar";
import { setActiveConversation } from "../lib/notifications";
import { colors, typography } from "../theme";

export function ConversationScreen({ route }: AppScreenProps<"Conversation">) {
    const { userID, username } = route.params;
    const allMessages = useStore($messages);
    const user = useStore($user);

    // Store keeps messages oldest-first; inverted FlatList needs newest-first
    const messages = useMemo(() => {
        const thread = allMessages[userID] ?? [];
        return [...thread].reverse();
    }, [allMessages, userID]);

    // Track active conversation for notification suppression + mark read
    useEffect(() => {
        setActiveConversation(userID);
        vexService.markRead(userID);
        return () => {
            setActiveConversation(null);
        };
    }, [userID]);

    // Mark read whenever new messages arrive while viewing
    useEffect(() => {
        if (messages.length > 0) vexService.markRead(userID);
    }, [messages.length, userID]);

    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const sendInFlightRef = useRef(false);
    const insets = useSafeAreaInsets();

    const sendMessage = useCallback(async () => {
        const content = text.trim();
        if (!content || !user || sendInFlightRef.current) return;
        sendInFlightRef.current = true;
        setSending(true);
        setText("");
        setError("");
        try {
            const result = await vexService.sendDM(userID, content);
            if (!result.ok) {
                setError(result.error ?? "Failed to send");
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to send");
        } finally {
            sendInFlightRef.current = false;
            setSending(false);
        }
    }, [text, user, userID, sendInFlightRef]);

    function renderMessage({ item }: { item: Message }) {
        const isOwn = item.authorID === user?.userID;
        return (
            <MessageBubbleRN
                authorName={isOwn ? "You" : username}
                isOwn={isOwn}
                message={item}
            />
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={insets.top}
            style={styles.container}
        >
            <ChatHeader subtitle={`@${username}`} title="Home" />

            {messages.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyText}>No messages yet.</Text>
                    <Text style={styles.emptyHint}>
                        Say hello to {username}!
                    </Text>
                </View>
            ) : (
                <FlatList
                    contentContainerStyle={styles.list}
                    data={messages}
                    inverted
                    keyExtractor={(m) => m.mailID}
                    renderItem={renderMessage}
                />
            )}

            {error !== "" && (
                <View style={styles.errorBar}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            <MessageInputBar
                onChangeText={setText}
                onSend={() => void sendMessage()}
                placeholder={`Message @${username}`}
                sending={sending}
                value={text}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.bg,
        flex: 1,
    },
    empty: {
        alignItems: "center",
        flex: 1,
        justifyContent: "center",
    },
    emptyHint: {
        ...typography.body,
        color: colors.muted,
        fontSize: 11,
        marginTop: 4,
    },
    emptyText: {
        ...typography.body,
        color: colors.mutedDark,
        fontStyle: "italic",
    },
    errorBar: {
        backgroundColor: "rgba(229, 57, 53, 0.15)",
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    errorText: {
        ...typography.body,
        color: colors.error,
    },
    list: {
        paddingVertical: 8,
    },
});

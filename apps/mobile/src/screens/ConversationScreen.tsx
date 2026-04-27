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

const GROUP_WINDOW_MS = 10 * 60 * 1000;

export function ConversationScreen({
    navigation,
    route,
}: AppScreenProps<"Conversation">) {
    const { userID, username } = route.params;
    const allMessages = useStore($messages);
    const user = useStore($user);

    // Store keeps messages oldest-first; inverted FlatList needs newest-first
    const messages = useMemo(() => {
        const thread = allMessages[userID] ?? [];
        return [...thread].reverse();
    }, [allMessages, userID]);
    const identityVisibility = useMemo(
        () => buildIdentityVisibility(messages),
        [messages],
    );

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

    function renderMessage({ index, item }: { index: number; item: Message }) {
        const isOwn = item.authorID === user?.userID;
        const ownName = user?.username ?? "Unknown";
        const showIdentity = identityVisibility[index] ?? true;
        return (
            <MessageBubbleRN
                authorName={isOwn ? ownName : username}
                isOwn={isOwn}
                message={item}
                showIdentity={showIdentity}
            />
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={insets.top}
            style={styles.container}
        >
            <ChatHeader
                onTitlePress={() => {
                    navigation.navigate("DMList");
                }}
                subtitle={`@${username}`}
                title="Direct Messages"
            />

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
                bottomInset={insets.bottom}
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

function buildIdentityVisibility(messages: Message[]): boolean[] {
    const visibility = Array<boolean>(messages.length).fill(true);
    let chunkAuthorID: null | string = null;
    let chunkStartTs = 0;

    // Process oldest -> newest so chunk windows are stable.
    for (let index = messages.length - 1; index >= 0; index--) {
        const current = messages[index];
        if (!current || current.group === "__system__") {
            visibility[index] = true;
            chunkAuthorID = null;
            chunkStartTs = 0;
            continue;
        }

        const currentTs = Date.parse(current.timestamp);
        if (Number.isNaN(currentTs)) {
            visibility[index] = true;
            chunkAuthorID = null;
            chunkStartTs = 0;
            continue;
        }

        if (chunkAuthorID !== current.authorID) {
            visibility[index] = true;
            chunkAuthorID = current.authorID;
            chunkStartTs = currentTs;
            continue;
        }

        const elapsed = currentTs - chunkStartTs;
        if (elapsed >= 0 && elapsed <= GROUP_WINDOW_MS) {
            visibility[index] = false;
            continue;
        }

        visibility[index] = true;
        chunkStartTs = currentTs;
    }

    return visibility;
}

import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "@nanostores/react";
import type { IMessage } from "@vex-chat/libvex";
import { $groupMessages, $client, $user } from "../store";
import { markRead, sendGroupMessage } from "@vex-chat/store";
import { setActiveConversation } from "../lib/notifications";
import { colors } from "../theme";
import { ChatHeader } from "../components/ChatHeader";
import { MessageBubbleRN } from "../components/MessageBubbleRN";
import { MessageInputBar } from "../components/MessageInputBar";

export function ChannelScreen({
    route,
    navigation,
}: {
    route: any;
    navigation: any;
}) {
    const { channelID, channelName, serverID } = route.params as {
        channelID: string;
        channelName: string;
        serverID: string;
    };
    const allGroupMessages = useStore($groupMessages);
    const client = useStore($client);
    const user = useStore($user);

    // Store keeps messages oldest-first; inverted FlatList needs newest-first
    const messages = useMemo(() => {
        const thread = allGroupMessages[channelID] ?? [];
        return [...thread].reverse();
    }, [allGroupMessages, channelID]);

    // Track active channel for notification suppression + mark read
    useEffect(() => {
        setActiveConversation(channelID);
        markRead(channelID);
        return () => {
            setActiveConversation(null);
        };
    }, [channelID]);

    useEffect(() => {
        if (messages.length > 0) markRead(channelID);
    }, [messages.length, channelID]);

    const insets = useSafeAreaInsets();
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState("");
    const [usernames, setUsernames] = useState<Record<string, string>>({});

    // Load channel members to resolve userIDs → usernames
    useEffect(() => {
        if (!client) return;
        client.channels
            .userList(channelID)
            .then((members: any[]) => {
                const map: Record<string, string> = {};
                for (const m of members) map[m.userID] = m.username;
                setUsernames(map);
            })
            .catch(() => {});
    }, [client, channelID]);

    const sendMessage = useCallback(async () => {
        const content = text.trim();
        if (!content || !user) return;
        setSending(true);
        setSendError("");
        setText("");
        try {
            const result = await sendGroupMessage(channelID, content);
            if (!result.ok) {
                setSendError(result.error ?? "Failed to send");
            }
        } catch (err) {
            setSendError(err instanceof Error ? err.message : "Failed to send");
        }
        setSending(false);
    }, [text, user, channelID]);

    function renderMessage({ item }: { item: IMessage }) {
        const isOwn = item.authorID === user?.userID;
        return (
            <MessageBubbleRN
                message={item}
                isOwn={isOwn}
                authorName={
                    isOwn
                        ? "You"
                        : (usernames[item.authorID] ??
                          item.authorID.slice(0, 8))
                }
            />
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={insets.top}
        >
            <ChatHeader
                title={`# ${channelName}`}
                onBack={() => navigation.navigate("ChannelList", { serverID })}
            />

            <FlatList
                data={messages}
                keyExtractor={(m) => m.mailID}
                renderItem={renderMessage}
                inverted
                contentContainerStyle={styles.list}
            />

            <MessageInputBar
                value={text}
                onChangeText={setText}
                onSend={sendMessage}
                placeholder={`Message #${channelName}`}
                sending={sending}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    list: {
        paddingVertical: 8,
    },
});

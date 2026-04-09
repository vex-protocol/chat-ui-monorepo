import type { Message } from "@vex-chat/libvex";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { markRead, sendGroupMessage } from "@vex-chat/store";

import { useStore } from "@nanostores/react";

import { ChatHeader } from "../components/ChatHeader";
import { MessageBubbleRN } from "../components/MessageBubbleRN";
import { MessageInputBar } from "../components/MessageInputBar";
import { setActiveConversation } from "../lib/notifications";
import { $client, $groupMessages, $user } from "../store";
import { colors } from "../theme";

export function ChannelScreen({
    navigation,
    route,
}: {
    navigation: any;
    route: any;
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
    const [_sendError, setSendError] = useState("");
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

    function renderMessage({ item }: { item: Message }) {
        const isOwn = item.authorID === user?.userID;
        return (
            <MessageBubbleRN
                authorName={
                    isOwn
                        ? "You"
                        : (usernames[item.authorID] ??
                          item.authorID.slice(0, 8))
                }
                isOwn={isOwn}
                message={item}
            />
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={insets.top}
            style={styles.container}
        >
            <ChatHeader
                onBack={() => navigation.navigate("ChannelList", { serverID })}
                title={`# ${channelName}`}
            />

            <FlatList
                contentContainerStyle={styles.list}
                data={messages}
                inverted
                keyExtractor={(m) => m.mailID}
                renderItem={renderMessage}
            />

            <MessageInputBar
                onChangeText={setText}
                onSend={sendMessage}
                placeholder={`Message #${channelName}`}
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
    list: {
        paddingVertical: 8,
    },
});

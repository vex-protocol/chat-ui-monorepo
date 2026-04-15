import type { AppScreenProps } from "../navigation/types";
import type { Message } from "@vex-chat/libvex";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
} from "react-native";

import { $groupMessages, $servers, $user, vexService } from "@vex-chat/store";

import { useStore } from "@nanostores/react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatHeader } from "../components/ChatHeader";
import { MessageBubbleRN } from "../components/MessageBubbleRN";
import { MessageInputBar } from "../components/MessageInputBar";
import { setActiveConversation } from "../lib/notifications";
import { colors } from "../theme";

export function ChannelScreen({
    navigation,
    route,
}: AppScreenProps<"Channel">) {
    const { channelID, channelName, serverID } = route.params;
    const allGroupMessages = useStore($groupMessages);
    // Scoped to just this server's slot so other server churn doesn't re-render us.
    const servers = useStore($servers, { keys: [serverID] });
    const user = useStore($user);
    const serverName = servers[serverID]?.name ?? "";

    // Store keeps messages oldest-first; inverted FlatList needs newest-first
    const messages = useMemo(() => {
        const thread = allGroupMessages[channelID] ?? [];
        return [...thread].reverse();
    }, [allGroupMessages, channelID]);

    // Track active channel for notification suppression + mark read
    useEffect(() => {
        setActiveConversation(channelID);
        vexService.markRead(channelID);
        return () => {
            setActiveConversation(null);
        };
    }, [channelID]);

    useEffect(() => {
        if (messages.length > 0) vexService.markRead(channelID);
    }, [messages.length, channelID]);

    const insets = useSafeAreaInsets();
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [_sendError, setSendError] = useState("");
    const [usernames, setUsernames] = useState<Record<string, string>>({});

    // Load channel members to resolve userIDs → usernames
    useEffect(() => {
        vexService
            .getChannelMembers(channelID)
            .then((members) => {
                const map: Record<string, string> = {};
                for (const m of members) map[m.userID] = m.username;
                setUsernames(map);
            })
            .catch(() => {});
    }, [channelID]);

    const sendMessage = useCallback(async () => {
        const content = text.trim();
        if (!content || !user) return;
        setSending(true);
        setSendError("");
        setText("");
        try {
            const result = await vexService.sendGroupMessage(
                channelID,
                content,
            );
            if (!result.ok) {
                setSendError(result.error ?? "Failed to send");
            }
        } catch (err: unknown) {
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
                onBack={() => {
                    navigation.navigate("ChannelList", { serverID });
                }}
                onOverflow={() => {
                    navigation.navigate("Invite", { serverID, serverName });
                }}
                subtitle={`# ${channelName}`}
                title={serverName || "Server"}
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
                onSend={() => void sendMessage()}
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

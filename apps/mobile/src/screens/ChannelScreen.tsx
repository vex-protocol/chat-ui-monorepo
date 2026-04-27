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
} from "react-native";

import { $groupMessages, $servers, $user, vexService } from "@vex-chat/store";

import { useStore } from "@nanostores/react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatHeader } from "../components/ChatHeader";
import { MessageBubbleRN } from "../components/MessageBubbleRN";
import { MessageInputBar } from "../components/MessageInputBar";
import { setActiveConversation } from "../lib/notifications";
import { colors } from "../theme";

const GROUP_WINDOW_MS = 10 * 60 * 1000;

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
    const identityVisibility = useMemo(
        () => buildIdentityVisibility(messages),
        [messages],
    );

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
    const sendInFlightRef = useRef(false);
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
        if (!content || !user || sendInFlightRef.current) return;
        sendInFlightRef.current = true;
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
        } finally {
            sendInFlightRef.current = false;
            setSending(false);
        }
    }, [text, user, channelID, sendInFlightRef]);

    function renderMessage({ index, item }: { index: number; item: Message }) {
        const isOwn = item.authorID === user?.userID;
        const ownName = user?.username ?? "Unknown";
        const showIdentity = identityVisibility[index] ?? true;
        return (
            <MessageBubbleRN
                authorName={
                    isOwn
                        ? ownName
                        : (usernames[item.authorID] ??
                          item.authorID.slice(0, 8))
                }
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
                bottomInset={insets.bottom}
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

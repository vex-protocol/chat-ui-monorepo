import type { AppScreenProps } from "../navigation/types";
import type { Message } from "@vex-chat/libvex";

import React, { useEffect, useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import {
    $channels,
    $channelUnreadCounts,
    $dmUnreadCounts,
    $familiars,
    $groupMessages,
    $messages,
    $servers,
    $user,
    formatTime,
    vexService,
} from "@vex-chat/store";

import { useStore } from "@nanostores/react";

import { Avatar } from "../components/Avatar";
import { ChatHeader } from "../components/ChatHeader";
import {
    $messageNotificationEntries,
    clearMessageNotificationEntriesForThread,
} from "../lib/notifications";
import { colors, typography } from "../theme";

interface NotificationRow {
    authorID: string;
    channelID?: string;
    channelName?: string;
    key: string;
    kind: "dm" | "group";
    message?: Message;
    preview: string;
    serverID?: string;
    sortTimestamp: number;
    subtitle: string;
    threadID: string;
    time: string;
    title: string;
    unreadCount: number;
}

export function NotificationsScreen({
    navigation,
}: AppScreenProps<"Notifications">) {
    const entries = useStore($messageNotificationEntries);
    const familiars = useStore($familiars);
    const allMessages = useStore($messages);
    const allGroupMessages = useStore($groupMessages);
    const dmUnreadCounts = useStore($dmUnreadCounts);
    const channelUnreadCounts = useStore($channelUnreadCounts);
    const channels = useStore($channels);
    const servers = useStore($servers);
    const user = useStore($user);

    const rows = useMemo(() => {
        const rowsByMailID = new Map<string, NotificationRow>();

        const addRow = (row: NotificationRow | undefined): void => {
            if (row) {
                rowsByMailID.set(row.key, row);
            }
        };

        const makeDmRow = (
            message: Message,
            unreadCount: number,
        ): NotificationRow => {
            const authorName =
                familiars[message.authorID]?.username ??
                message.authorID.slice(0, 8);
            return {
                authorID: message.authorID,
                key: message.mailID,
                kind: "dm",
                message,
                preview: message.message,
                sortTimestamp: Date.parse(message.timestamp),
                subtitle: "Direct Messages",
                threadID: message.authorID,
                time: formatTime(message.timestamp),
                title: authorName,
                unreadCount,
            };
        };

        const makeGroupRow = (
            message: Message,
            channelID: string,
            unreadCount: number,
        ): NotificationRow => {
            const serverID = findServerForChannel(channels, channelID);
            const channel = serverID
                ? channels[serverID]?.find(
                      (item) => item.channelID === channelID,
                  )
                : undefined;
            const channelName = channel?.name ?? "channel";
            const serverName = serverID
                ? (servers[serverID]?.name ?? serverID.slice(0, 8))
                : "Server";
            const authorName =
                familiars[message.authorID]?.username ??
                message.authorID.slice(0, 8);
            return {
                authorID: message.authorID,
                channelID,
                channelName,
                key: message.mailID,
                kind: "group",
                message,
                preview: message.message,
                serverID,
                sortTimestamp: Date.parse(message.timestamp),
                subtitle: `${serverName} · #${channelName}`,
                threadID: channelID,
                time: formatTime(message.timestamp),
                title: authorName,
                unreadCount,
            };
        };

        for (const entry of entries) {
            const unreadCount =
                entry.kind === "group"
                    ? (channelUnreadCounts[entry.threadID] ?? 0)
                    : (dmUnreadCounts[entry.threadID] ?? 0);
            const displayCount = Math.max(1, unreadCount);

            const message =
                entry.kind === "group"
                    ? findMessage(
                          allGroupMessages[entry.threadID],
                          entry.mailID,
                      )
                    : findMessage(allMessages[entry.threadID], entry.mailID);
            if (message) {
                addRow(
                    entry.kind === "group"
                        ? makeGroupRow(message, entry.threadID, displayCount)
                        : makeDmRow(message, displayCount),
                );
                continue;
            }

            const authorName =
                familiars[entry.authorID]?.username ??
                entry.authorID.slice(0, 8);
            if (entry.kind === "group") {
                const channelID = entry.channelID ?? entry.threadID;
                const serverID =
                    entry.serverID ?? findServerForChannel(channels, channelID);
                const channel = serverID
                    ? channels[serverID]?.find(
                          (item) => item.channelID === channelID,
                      )
                    : undefined;
                const channelName = channel?.name ?? "channel";
                const serverName = serverID
                    ? (servers[serverID]?.name ?? serverID.slice(0, 8))
                    : "Server";
                addRow({
                    authorID: entry.authorID,
                    channelID,
                    channelName,
                    key: entry.mailID,
                    kind: "group",
                    preview: "New message",
                    serverID,
                    sortTimestamp: Date.parse(entry.timestamp),
                    subtitle: `${serverName} · #${channelName}`,
                    threadID: entry.threadID,
                    time: formatTime(entry.timestamp),
                    title: authorName,
                    unreadCount: displayCount,
                });
                continue;
            }

            addRow({
                authorID: entry.authorID,
                key: entry.mailID,
                kind: "dm",
                preview: "New message",
                sortTimestamp: Date.parse(entry.timestamp),
                subtitle: "Direct Messages",
                threadID: entry.threadID,
                time: formatTime(entry.timestamp),
                title: authorName,
                unreadCount: displayCount,
            });
        }

        for (const [threadID, unreadCount] of Object.entries(dmUnreadCounts)) {
            if (unreadCount <= 0) {
                continue;
            }
            const unreadMessages = (allMessages[threadID] ?? [])
                .filter((message) => message.authorID !== user?.userID)
                .slice(-unreadCount);
            for (const message of unreadMessages) {
                addRow(makeDmRow(message, unreadCount));
            }
        }

        for (const [channelID, unreadCount] of Object.entries(
            channelUnreadCounts,
        )) {
            if (unreadCount <= 0) {
                continue;
            }
            const unreadMessages = (allGroupMessages[channelID] ?? [])
                .filter((message) => message.authorID !== user?.userID)
                .slice(-unreadCount);
            for (const message of unreadMessages) {
                addRow(makeGroupRow(message, channelID, unreadCount));
            }
        }

        return [...rowsByMailID.values()].sort(
            (a, b) => b.sortTimestamp - a.sortTimestamp,
        );
    }, [
        allGroupMessages,
        allMessages,
        channelUnreadCounts,
        channels,
        dmUnreadCounts,
        entries,
        familiars,
        servers,
        user?.userID,
    ]);

    useEffect(() => {
        console.info("[vex-push] notifications screen state", {
            channelUnreadThreads: Object.keys(channelUnreadCounts).length,
            dmUnreadThreads: Object.keys(dmUnreadCounts).length,
            entries: entries.length,
            rows: rows.length,
        });
    }, [channelUnreadCounts, dmUnreadCounts, entries.length, rows.length]);

    function openRow(row: NotificationRow): void {
        clearMessageNotificationEntriesForThread(row.threadID);
        vexService.markRead(row.threadID);

        if (row.kind === "group") {
            if (!row.channelID || !row.channelName || !row.serverID) {
                return;
            }
            navigation.navigate("Channel", {
                channelID: row.channelID,
                channelName: row.channelName,
                serverID: row.serverID,
            });
            return;
        }

        navigation.navigate("Conversation", {
            userID: row.authorID,
            username: row.title,
        });
    }

    function renderRow({ item }: { item: NotificationRow }) {
        const disabled =
            item.kind === "group" &&
            (!item.channelID || !item.channelName || !item.serverID);
        return (
            <Pressable
                accessibilityRole="button"
                disabled={disabled}
                onPress={() => {
                    openRow(item);
                }}
                style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                    disabled && styles.rowDisabled,
                ]}
            >
                <Avatar
                    displayName={item.title}
                    size={40}
                    userID={item.authorID}
                />
                <View style={styles.rowContent}>
                    <View style={styles.rowTitleLine}>
                        <Text numberOfLines={1} style={styles.rowTitle}>
                            {item.title}
                        </Text>
                        <Text style={styles.rowTime}>{item.time}</Text>
                    </View>
                    <Text numberOfLines={1} style={styles.rowSubtitle}>
                        {item.subtitle}
                    </Text>
                    <Text numberOfLines={2} style={styles.rowPreview}>
                        {item.preview}
                    </Text>
                </View>
                <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>
                        {item.unreadCount > 99 ? "99+" : item.unreadCount}
                    </Text>
                </View>
            </Pressable>
        );
    }

    return (
        <View style={styles.container}>
            <ChatHeader
                onBack={() => {
                    navigation.navigate("DMList");
                }}
                title="Notifications"
            />

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>NEW MESSAGES</Text>
                <Text style={styles.sectionMeta}>{rows.length}</Text>
            </View>

            {rows.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyText}>You're caught up.</Text>
                </View>
            ) : (
                <FlatList
                    contentContainerStyle={styles.list}
                    data={rows}
                    keyExtractor={(item) => item.key}
                    renderItem={renderRow}
                />
            )}
        </View>
    );
}

function findMessage(
    thread: Message[] | undefined,
    mailID: string,
): Message | undefined {
    return thread?.find((message) => message.mailID === mailID);
}

function findServerForChannel(
    channels: Record<string, Array<{ channelID: string }>>,
    channelID: string,
): string | undefined {
    for (const [serverID, serverChannels] of Object.entries(channels)) {
        if (serverChannels.some((channel) => channel.channelID === channelID)) {
            return serverID;
        }
    }
    return undefined;
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#11131a",
        flex: 1,
    },
    empty: {
        alignItems: "center",
        borderColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        marginHorizontal: 14,
        marginTop: 8,
        paddingHorizontal: 16,
        paddingVertical: 18,
    },
    emptyText: {
        ...typography.button,
        color: colors.textSecondary,
    },
    list: {
        paddingBottom: 16,
    },
    row: {
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.02)",
        borderColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        flexDirection: "row",
        gap: 12,
        marginBottom: 8,
        marginHorizontal: 14,
        paddingHorizontal: 10,
        paddingVertical: 10,
    },
    rowContent: {
        flex: 1,
        minWidth: 0,
    },
    rowDisabled: {
        opacity: 0.55,
    },
    rowPressed: {
        backgroundColor: "rgba(255,255,255,0.05)",
    },
    rowPreview: {
        ...typography.body,
        color: "rgba(255,255,255,0.62)",
        marginTop: 2,
    },
    rowSubtitle: {
        ...typography.body,
        color: "rgba(255,255,255,0.48)",
        marginTop: 1,
    },
    rowTime: {
        ...typography.body,
        color: "rgba(255,255,255,0.42)",
        flexShrink: 0,
        fontSize: 11,
    },
    rowTitle: {
        ...typography.button,
        color: colors.textSecondary,
        flex: 1,
        fontSize: 15,
    },
    rowTitleLine: {
        alignItems: "center",
        flexDirection: "row",
        gap: 8,
    },
    sectionHeader: {
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    sectionMeta: {
        ...typography.body,
        color: "rgba(255,255,255,0.52)",
        fontSize: 11,
    },
    sectionTitle: {
        ...typography.label,
        color: "rgba(255,255,255,0.52)",
    },
    unreadBadge: {
        alignItems: "center",
        backgroundColor: colors.error,
        borderRadius: 12,
        justifyContent: "center",
        minWidth: 24,
        paddingHorizontal: 6,
        paddingVertical: 3,
    },
    unreadText: {
        color: "#fff",
        fontSize: 11,
        fontWeight: "700",
    },
});

import type { AppScreenProps } from "../navigation/types";
import type { Message } from "@vex-chat/libvex";

import React, { useEffect, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

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

interface DmNotificationRow {
    key: string;
    latestMailID: string;
    preview: string;
    sortTimestamp: number;
    threadID: string;
    time: string;
    title: string;
    unreadCount: number;
    userID: string;
}

interface NotificationRow {
    authorID: string;
    channelID?: string;
    channelName?: string;
    key: string;
    kind: "dm" | "group";
    message?: Message;
    preview: string;
    serverID?: string;
    serverName?: string;
    sortTimestamp: number;
    subtitle: string;
    threadID: string;
    time: string;
    title: string;
    unreadCount: number;
}

interface ServerNotificationRow {
    authorIDs: string[];
    authorNames: Record<string, string>;
    channelID?: string;
    channelName?: string;
    key: string;
    latestMailID: string;
    latestThreadID: string;
    preview: string;
    serverID?: string;
    sortTimestamp: number;
    subtitle: string;
    threadIDs: string[];
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
                serverName,
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
                    serverName,
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

    const { dmRows, serverRows } = useMemo(
        () => aggregateNotificationRows(rows),
        [rows],
    );

    useEffect(() => {
        console.info("[vex-push] notifications screen state", {
            channelUnreadThreads: Object.keys(channelUnreadCounts).length,
            dms: dmRows.length,
            dmUnreadThreads: Object.keys(dmUnreadCounts).length,
            entries: entries.length,
            rows: rows.length,
            servers: serverRows.length,
        });
    }, [
        channelUnreadCounts,
        dmRows.length,
        dmUnreadCounts,
        entries.length,
        rows.length,
        serverRows.length,
    ]);

    function openDmRow(row: DmNotificationRow): void {
        clearMessageNotificationEntriesForThread(row.threadID);
        vexService.markRead(row.threadID);
        navigation.navigate("Conversation", {
            userID: row.userID,
            username: row.title,
        });
    }

    function openServerRow(row: ServerNotificationRow): void {
        if (!row.channelID || !row.channelName || !row.serverID) {
            return;
        }
        clearMessageNotificationEntriesForThread(row.latestThreadID);
        vexService.markRead(row.latestThreadID);
        navigation.navigate("Channel", {
            channelID: row.channelID,
            channelName: row.channelName,
            serverID: row.serverID,
        });
    }

    function renderDmRow(item: DmNotificationRow) {
        return (
            <Pressable
                accessibilityRole="button"
                key={item.key}
                onPress={() => {
                    openDmRow(item);
                }}
                style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                ]}
            >
                <Avatar
                    displayName={item.title}
                    size={40}
                    userID={item.userID}
                />
                <View style={styles.rowContent}>
                    <View style={styles.rowTitleLine}>
                        <Text numberOfLines={1} style={styles.rowTitle}>
                            {item.title}
                        </Text>
                        <Text style={styles.rowTime}>{item.time}</Text>
                    </View>
                    <Text numberOfLines={1} style={styles.rowPreview}>
                        {item.preview}
                    </Text>
                </View>
                <UnreadBadge count={item.unreadCount} />
            </Pressable>
        );
    }

    function renderServerRow(item: ServerNotificationRow) {
        const disabled = !item.channelID || !item.channelName || !item.serverID;
        return (
            <Pressable
                accessibilityRole="button"
                disabled={disabled}
                key={item.key}
                onPress={() => {
                    openServerRow(item);
                }}
                style={({ pressed }) => [
                    styles.serverRow,
                    pressed && styles.rowPressed,
                    disabled && styles.rowDisabled,
                ]}
            >
                <AvatarStack
                    authorIDs={item.authorIDs}
                    authorNames={item.authorNames}
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
                    <Text numberOfLines={1} style={styles.rowPreview}>
                        {item.preview}
                    </Text>
                </View>
                <UnreadBadge count={item.unreadCount} />
            </Pressable>
        );
    }

    const totalRows = dmRows.length + serverRows.length;

    return (
        <View style={styles.container}>
            <ChatHeader
                onBack={() => {
                    navigation.navigate("DMList");
                }}
                title="Notifications"
            />

            {totalRows === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyText}>You're caught up.</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.list}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>DIRECT MESSAGES</Text>
                        <Text style={styles.sectionMeta}>{dmRows.length}</Text>
                    </View>
                    {dmRows.length === 0 ? (
                        <Text style={styles.sectionEmpty}>
                            No new direct messages
                        </Text>
                    ) : (
                        dmRows.map(renderDmRow)
                    )}

                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>SERVERS</Text>
                        <Text style={styles.sectionMeta}>
                            {serverRows.length}
                        </Text>
                    </View>
                    {serverRows.length === 0 ? (
                        <Text style={styles.sectionEmpty}>
                            No new server messages
                        </Text>
                    ) : (
                        serverRows.map(renderServerRow)
                    )}
                </ScrollView>
            )}
        </View>
    );
}

function aggregateNotificationRows(rows: NotificationRow[]): {
    dmRows: DmNotificationRow[];
    serverRows: ServerNotificationRow[];
} {
    const dmByThread = new Map<
        string,
        {
            latest?: NotificationRow;
            mailIDs: Set<string>;
            maxUnread: number;
        }
    >();
    const serverByKey = new Map<
        string,
        {
            authorLatest: Map<string, { name: string; timestamp: number }>;
            latest?: NotificationRow;
            mailIDsByThread: Map<string, Set<string>>;
            maxUnreadByThread: Map<string, number>;
            threadIDs: Set<string>;
        }
    >();

    for (const row of rows) {
        if (row.kind === "dm") {
            const bucket = dmByThread.get(row.threadID) ?? {
                mailIDs: new Set<string>(),
                maxUnread: 0,
            };
            bucket.mailIDs.add(row.key);
            bucket.maxUnread = Math.max(bucket.maxUnread, row.unreadCount);
            if (
                !bucket.latest ||
                row.sortTimestamp > bucket.latest.sortTimestamp
            ) {
                bucket.latest = row;
            }
            dmByThread.set(row.threadID, bucket);
            continue;
        }

        const serverKey = row.serverID ?? row.channelID ?? row.threadID;
        const bucket = serverByKey.get(serverKey) ?? {
            authorLatest: new Map<
                string,
                { name: string; timestamp: number }
            >(),
            mailIDsByThread: new Map<string, Set<string>>(),
            maxUnreadByThread: new Map<string, number>(),
            threadIDs: new Set<string>(),
        };
        bucket.threadIDs.add(row.threadID);
        const mailIDs = bucket.mailIDsByThread.get(row.threadID) ?? new Set();
        mailIDs.add(row.key);
        bucket.mailIDsByThread.set(row.threadID, mailIDs);
        bucket.maxUnreadByThread.set(
            row.threadID,
            Math.max(
                bucket.maxUnreadByThread.get(row.threadID) ?? 0,
                row.unreadCount,
            ),
        );
        const authorLatest = bucket.authorLatest.get(row.authorID);
        if (!authorLatest || row.sortTimestamp > authorLatest.timestamp) {
            bucket.authorLatest.set(row.authorID, {
                name: row.title,
                timestamp: row.sortTimestamp,
            });
        }
        if (!bucket.latest || row.sortTimestamp > bucket.latest.sortTimestamp) {
            bucket.latest = row;
        }
        serverByKey.set(serverKey, bucket);
    }

    const dmRows = [...dmByThread.entries()]
        .flatMap(([threadID, bucket]): DmNotificationRow[] => {
            const latest = bucket.latest;
            if (!latest) return [];
            return [
                {
                    key: threadID,
                    latestMailID: latest.key,
                    preview: latest.preview,
                    sortTimestamp: latest.sortTimestamp,
                    threadID,
                    time: latest.time,
                    title: latest.title,
                    unreadCount: Math.max(
                        bucket.maxUnread,
                        bucket.mailIDs.size,
                    ),
                    userID: latest.authorID,
                },
            ];
        })
        .sort((a, b) => b.sortTimestamp - a.sortTimestamp);

    const serverRows = [...serverByKey.entries()]
        .flatMap(([serverKey, bucket]): ServerNotificationRow[] => {
            const latest = bucket.latest;
            if (!latest) return [];
            const authorIDs = [...bucket.authorLatest.entries()]
                .sort((a, b) => b[1].timestamp - a[1].timestamp)
                .map(([authorID]) => authorID);
            const authorNames = Object.fromEntries(
                [...bucket.authorLatest.entries()].map(([authorID, value]) => [
                    authorID,
                    value.name,
                ]),
            );
            const unreadCount = [...bucket.threadIDs].reduce(
                (total, threadID) => {
                    const messageCount =
                        bucket.mailIDsByThread.get(threadID)?.size ?? 0;
                    const maxUnread =
                        bucket.maxUnreadByThread.get(threadID) ?? 0;
                    return total + Math.max(maxUnread, messageCount);
                },
                0,
            );
            const channelCount = bucket.threadIDs.size;
            return [
                {
                    authorIDs,
                    authorNames,
                    channelID: latest.channelID,
                    channelName: latest.channelName,
                    key: serverKey,
                    latestMailID: latest.key,
                    latestThreadID: latest.threadID,
                    preview: latest.preview,
                    serverID: latest.serverID,
                    sortTimestamp: latest.sortTimestamp,
                    subtitle:
                        channelCount > 1
                            ? `${channelCount.toString()} channels · latest #${latest.channelName ?? "channel"}`
                            : `#${latest.channelName ?? "channel"}`,
                    threadIDs: [...bucket.threadIDs],
                    time: latest.time,
                    title: latest.serverName ?? latest.subtitle.split(" · ")[0],
                    unreadCount,
                },
            ];
        })
        .sort((a, b) => b.sortTimestamp - a.sortTimestamp);

    return { dmRows, serverRows };
}

function AvatarStack({
    authorIDs,
    authorNames,
}: {
    authorIDs: string[];
    authorNames: Record<string, string>;
}) {
    const visible = authorIDs.slice(0, 4);
    return (
        <View style={styles.avatarStack}>
            {visible.map((authorID, idx) => (
                <View
                    key={authorID}
                    style={[
                        styles.avatarStackItem,
                        idx > 0 && styles.avatarStackOverlap,
                        { zIndex: visible.length - idx },
                    ]}
                >
                    <Avatar
                        displayName={authorNames[authorID]}
                        ring={{ color: "#11131a", width: 2 }}
                        size={30}
                        userID={authorID}
                    />
                </View>
            ))}
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

function UnreadBadge({ count }: { count: number }) {
    return (
        <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
                {count > 99 ? "99+" : count.toString()}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    avatarStack: {
        alignItems: "center",
        flexDirection: "row",
        height: 40,
        width: 88,
    },
    avatarStackItem: {
        backgroundColor: "#11131a",
        borderRadius: 16,
    },
    avatarStackOverlap: {
        marginLeft: -10,
    },
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
        flexShrink: 1,
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
        minWidth: 0,
    },
    sectionEmpty: {
        ...typography.body,
        color: "rgba(255,255,255,0.42)",
        marginBottom: 12,
        marginHorizontal: 14,
        marginTop: -2,
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
    serverRow: {
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.03)",
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        flexDirection: "row",
        gap: 12,
        marginBottom: 8,
        marginHorizontal: 14,
        paddingHorizontal: 10,
        paddingVertical: 12,
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

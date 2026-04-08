import type { IUser } from "@vex-chat/libvex";
import type { IMessage } from "@vex-chat/libvex";

import React, { useCallback, useRef, useState } from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import {
    $dmUnreadCounts,
    avatarHue,
    $familiars as familiarsAtom,
} from "@vex-chat/store";

import { useStore } from "@nanostores/react";

import { ChatHeader } from "../components/ChatHeader";
import { $client, $familiars, $messages } from "../store";
import { colors, typography } from "../theme";

export function DMListScreen({ navigation }: { navigation: any }) {
    const familiars = useStore($familiars);
    const allMessages = useStore($messages);
    const client = useStore($client);
    const unreadCounts = useStore($dmUnreadCounts);

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<IUser[]>([]);
    const [searching, setSearching] = useState(false);
    const timerRef = useRef<null | ReturnType<typeof setTimeout>>(null);

    const familiarList = Object.values(familiars);

    const onSearch = useCallback(
        (text: string) => {
            setQuery(text);
            if (timerRef.current) clearTimeout(timerRef.current);
            const q = text.trim();
            if (!q) {
                setResults([]);
                return;
            }
            setSearching(true);
            timerRef.current = setTimeout(async () => {
                const [user] = (await client?.users.retrieve(q)) ?? [null];
                const found = user ? [user] : [];
                setResults(found);
                setSearching(false);
            }, 300);
        },
        [client],
    );

    function openConversation(user: IUser) {
        familiarsAtom.setKey(user.userID, user);
        setQuery("");
        setResults([]);
        navigation.navigate("Conversation", {
            userID: user.userID,
            username: user.username,
        });
    }

    function lastMessage(userID: string): IMessage | undefined {
        const thread = allMessages[userID];
        return thread?.[thread.length - 1];
    }

    function renderFamiliar({ item }: { item: IUser }) {
        const last = lastMessage(item.userID);
        const unread = unreadCounts[item.userID] ?? 0;
        return (
            <TouchableOpacity
                onPress={() => { openConversation(item); }}
                style={styles.row}
            >
                <View
                    style={[
                        styles.avatar,
                        {
                            backgroundColor: `hsl(${avatarHue(item.userID)}, 45%, 40%)`,
                        },
                    ]}
                >
                    <Text style={styles.avatarText}>
                        {item.username.slice(0, 1).toUpperCase()}
                    </Text>
                </View>
                <View style={styles.rowContent}>
                    <Text style={styles.username}>{item.username}</Text>
                    {last && (
                        <Text numberOfLines={1} style={styles.preview}>
                            {last.message}
                        </Text>
                    )}
                </View>
                {unread > 0 && (
                    <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>
                            {unread > 99 ? "99+" : unread}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    }

    function renderResult({ item }: { item: IUser }) {
        return (
            <TouchableOpacity
                onPress={() => { openConversation(item); }}
                style={styles.resultRow}
            >
                <View
                    style={[
                        styles.avatarSm,
                        {
                            backgroundColor: `hsl(${avatarHue(item.userID)}, 45%, 40%)`,
                        },
                    ]}
                >
                    <Text style={styles.avatarSmText}>
                        {item.username.slice(0, 1).toUpperCase()}
                    </Text>
                </View>
                <Text style={styles.resultName}>{item.username}</Text>
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.container}>
            <ChatHeader title="Home" />

            <View style={styles.searchWrap}>
                <TextInput
                    onChangeText={onSearch}
                    placeholder="Search by exact username..."
                    placeholderTextColor={colors.mutedDark}
                    style={styles.searchInput}
                    value={query}
                />
            </View>

            {results.length > 0 && (
                <FlatList
                    data={results}
                    keyboardShouldPersistTaps="handled"
                    keyExtractor={(u) => u.userID}
                    renderItem={renderResult}
                    style={styles.resultsList}
                />
            )}

            {query.trim() !== "" && results.length === 0 && !searching && (
                <Text style={styles.noResults}>No users found</Text>
            )}

            {searching && <Text style={styles.noResults}>Searching...</Text>}

            {familiarList.length === 0 && !query.trim() ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyText}>No conversations yet</Text>
                    <Text style={styles.emptyHint}>
                        Search for a user to start messaging
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={familiarList}
                    keyboardShouldPersistTaps="handled"
                    keyExtractor={(u) => u.userID}
                    renderItem={renderFamiliar}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    avatar: {
        alignItems: "center",
        borderRadius: 20,
        height: 40,
        justifyContent: "center",
        width: 40,
    },
    avatarSm: {
        alignItems: "center",
        borderRadius: 14,
        height: 28,
        justifyContent: "center",
        width: 28,
    },
    avatarSmText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "700",
    },
    avatarText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
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
    noResults: {
        ...typography.body,
        color: colors.mutedDark,
        fontStyle: "italic",
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    preview: {
        ...typography.body,
        color: colors.mutedDark,
        marginTop: 2,
    },
    resultName: {
        ...typography.button,
        color: colors.textSecondary,
    },
    resultRow: {
        alignItems: "center",
        backgroundColor: colors.surface,
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    resultsList: {
        borderBottomColor: colors.borderSubtle,
        borderBottomWidth: 1,
        maxHeight: 200,
    },
    row: {
        alignItems: "center",
        borderBottomColor: colors.borderSubtle,
        borderBottomWidth: 1,
        flexDirection: "row",
        gap: 12,
        padding: 12,
    },
    rowContent: {
        flex: 1,
    },
    searchInput: {
        backgroundColor: colors.input,
        borderColor: colors.borderSubtle,
        borderWidth: 1,
        color: colors.textSecondary,
        fontSize: 14,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    searchWrap: {
        borderBottomColor: colors.borderSubtle,
        borderBottomWidth: 1,
        padding: 8,
    },
    unreadBadge: {
        alignItems: "center",
        backgroundColor: colors.error,
        borderRadius: 10,
        height: 20,
        justifyContent: "center",
        marginLeft: "auto",
        minWidth: 20,
        paddingHorizontal: 5,
    },
    unreadText: {
        color: "#fff",
        fontSize: 11,
        fontWeight: "700",
    },
    username: {
        ...typography.button,
        color: colors.textSecondary,
        fontSize: 15,
    },
});

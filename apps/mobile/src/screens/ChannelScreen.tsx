import type { AppScreenProps } from "../navigation/types";
import type { User } from "@vex-chat/libvex";
import type { Message } from "@vex-chat/libvex";

import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    Animated,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import {
    $groupMessages,
    $permissions,
    $servers,
    $user,
    vexService,
} from "@vex-chat/store";

import { useStore } from "@nanostores/react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatHeader } from "../components/ChatHeader";
import { MessageBubbleRN } from "../components/MessageBubbleRN";
import { MessageInputBar } from "../components/MessageInputBar";
import { colors, typography } from "../theme";

const GROUP_WINDOW_MS = 10 * 60 * 1000;
const MEMBERS_DRAWER_WIDTH = 232;
const ONLINE_WINDOW_MS = 15 * 60 * 1000;

export function ChannelScreen({
    navigation,
    route,
}: AppScreenProps<"Channel">) {
    const { channelID, channelName, serverID } = route.params;
    const allGroupMessages = useStore($groupMessages);
    const permissions = useStore($permissions);
    // Scoped to just this server's slot so other server churn doesn't re-render us.
    const servers = useStore($servers, { keys: [serverID] });
    const user = useStore($user);
    const serverName = servers[serverID]?.name ?? "";
    const canOpenServerSettings = useMemo(() => {
        const myUserID = user?.userID;
        if (!myUserID) return false;
        const highestPower = Object.values(permissions)
            .filter(
                (permission) =>
                    permission.resourceID === serverID &&
                    permission.userID === myUserID,
            )
            .reduce(
                (maxPower, permission) =>
                    Math.max(maxPower, permission.powerLevel),
                0,
            );
        return highestPower >= 1;
    }, [permissions, serverID, user?.userID]);

    // Store keeps messages oldest-first; inverted FlatList needs newest-first
    const messages = useMemo(() => {
        const thread = allGroupMessages[channelID] ?? [];
        return [...thread].reverse();
    }, [allGroupMessages, channelID]);
    const identityVisibility = useMemo(
        () => buildIdentityVisibility(messages),
        [messages],
    );

    // Mark this channel as read while the screen is active
    useEffect(() => {
        vexService.markRead(channelID);
    }, [channelID]);

    useEffect(() => {
        if (messages.length > 0) vexService.markRead(channelID);
    }, [messages.length, channelID]);

    const insets = useSafeAreaInsets();
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [_sendError, setSendError] = useState("");
    const sendInFlightRef = useRef(false);
    const [members, setMembers] = useState<User[]>([]);
    const [usernames, setUsernames] = useState<Record<string, string>>({});
    const [nowMs, setNowMs] = useState(0);
    const [membersDrawerOpen, setMembersDrawerOpen] = useState(false);
    const [membersDrawerVisible, setMembersDrawerVisible] = useState(false);
    const [membersDrawerAnim] = useState(() => new Animated.Value(0));

    const membersBackdropOpacity = useMemo(
        () =>
            membersDrawerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.34],
            }),
        [membersDrawerAnim],
    );
    const membersDrawerX = useMemo(
        () =>
            membersDrawerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [MEMBERS_DRAWER_WIDTH, 0],
            }),
        [membersDrawerAnim],
    );

    const syncChannelMembers = useCallback(async (): Promise<void> => {
        const channelMembers = await vexService.getChannelMembers(channelID);
        setMembers(channelMembers);
        const map: Record<string, string> = {};
        for (const member of channelMembers) {
            map[member.userID] = member.username;
        }
        setUsernames(map);
    }, [channelID]);

    // Load channel members to resolve userIDs → usernames
    useEffect(() => {
        void syncChannelMembers().catch(() => {});
    }, [syncChannelMembers]);

    useEffect(() => {
        const tick = () => {
            setNowMs(Date.now());
        };
        tick();
        const interval = setInterval(tick, 60_000);
        return () => {
            clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        if (!membersDrawerOpen) return;
        void syncChannelMembers().catch(() => {});
        const interval = setInterval(() => {
            void syncChannelMembers().catch(() => {});
        }, 30_000);
        return () => {
            clearInterval(interval);
        };
    }, [membersDrawerOpen, syncChannelMembers]);

    function openMembersDrawer(): void {
        setMembersDrawerVisible(true);
        setMembersDrawerOpen(true);
        Animated.spring(membersDrawerAnim, {
            damping: 20,
            mass: 0.8,
            stiffness: 280,
            toValue: 1,
            useNativeDriver: true,
        }).start();
    }

    function closeMembersDrawer(): void {
        setMembersDrawerOpen(false);
        Animated.timing(membersDrawerAnim, {
            duration: 180,
            toValue: 0,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) {
                setMembersDrawerVisible(false);
            }
        });
    }

    function toggleMembersDrawer(): void {
        if (membersDrawerOpen) {
            closeMembersDrawer();
            return;
        }
        openMembersDrawer();
    }

    function isOnline(member: User): boolean {
        if (!member.lastSeen) return false;
        const lastSeenMs = new Date(member.lastSeen).getTime();
        if (Number.isNaN(lastSeenMs)) return false;
        return nowMs - lastSeenMs < ONLINE_WINDOW_MS;
    }

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

    const deleteMessage = useCallback(
        (message: Message) => {
            void vexService.deleteLocalMessage(channelID, message.mailID, true);
        },
        [channelID],
    );

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
                onDeleteMessage={deleteMessage}
                showIdentity={showIdentity}
            />
        );
    }

    function renderMember({ item }: { item: User }) {
        const online = isOnline(item);
        return (
            <TouchableOpacity disabled style={styles.memberRow}>
                <View style={styles.memberAvatarWrap}>
                    <View style={styles.memberAvatar}>
                        <Text style={styles.memberAvatarText}>
                            {item.username.slice(0, 1).toUpperCase()}
                        </Text>
                    </View>
                    <View
                        style={[
                            styles.memberPresenceDot,
                            online
                                ? styles.memberPresenceDotOnline
                                : styles.memberPresenceDotOffline,
                        ]}
                    />
                </View>
                <View style={styles.memberMeta}>
                    <Text numberOfLines={1} style={styles.memberName}>
                        {item.username}
                    </Text>
                    <Text numberOfLines={1} style={styles.memberSubtext}>
                        {online ? "Online" : "Offline"}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={insets.top}
            style={styles.container}
        >
            <ChatHeader
                onOverflow={
                    canOpenServerSettings
                        ? () => {
                              navigation.navigate("ServerSettings", {
                                  serverID,
                                  serverName,
                              });
                          }
                        : undefined
                }
                onUsers={() => {
                    toggleMembersDrawer();
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
            {membersDrawerVisible && (
                <>
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            styles.membersBackdrop,
                            { opacity: membersBackdropOpacity },
                        ]}
                    />
                    <Pressable
                        onPress={() => {
                            closeMembersDrawer();
                        }}
                        style={styles.membersBackdropPressable}
                    />
                    <Animated.View
                        pointerEvents="auto"
                        style={[
                            styles.membersDrawer,
                            { transform: [{ translateX: membersDrawerX }] },
                        ]}
                    >
                        <View style={styles.membersDrawerHeader}>
                            <Text style={styles.membersDrawerTitle}>
                                MEMBERS
                            </Text>
                            <Text style={styles.membersDrawerMeta}>
                                {members.length}
                            </Text>
                        </View>
                        {members.length === 0 ? (
                            <Text style={styles.membersEmptyText}>
                                No members found for this channel.
                            </Text>
                        ) : (
                            <FlatList
                                data={members}
                                keyExtractor={(member) => member.userID}
                                renderItem={renderMember}
                            />
                        )}
                    </Animated.View>
                </>
            )}
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
    memberAvatar: {
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.16)",
        borderRadius: 16,
        height: 32,
        justifyContent: "center",
        width: 32,
    },
    memberAvatarText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "700",
    },
    memberAvatarWrap: {
        position: "relative",
    },
    memberMeta: {
        flex: 1,
        gap: 1,
    },
    memberName: {
        ...typography.button,
        color: colors.textSecondary,
        fontSize: 12,
    },
    memberPresenceDot: {
        borderColor: "rgba(12,14,20,0.98)",
        borderRadius: 999,
        borderWidth: 2,
        bottom: -1,
        height: 10,
        position: "absolute",
        right: -1,
        width: 10,
    },
    memberPresenceDotOffline: {
        backgroundColor: "rgba(132,138,152,0.85)",
    },
    memberPresenceDotOnline: {
        backgroundColor: "#30D158",
    },
    memberRow: {
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.04)",
        borderColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        flexDirection: "row",
        gap: 8,
        marginRight: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    membersBackdrop: {
        ...StyleSheet.absoluteFill,
        backgroundColor: "rgba(0,0,0,0.36)",
    },
    membersBackdropPressable: {
        ...StyleSheet.absoluteFill,
    },
    membersDrawer: {
        backgroundColor: "rgba(12,14,20,0.98)",
        borderLeftColor: "rgba(255,255,255,0.1)",
        borderLeftWidth: 1,
        bottom: 0,
        paddingTop: 56,
        position: "absolute",
        right: 0,
        top: 0,
        width: MEMBERS_DRAWER_WIDTH,
    },
    membersDrawerHeader: {
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    membersDrawerMeta: {
        ...typography.body,
        color: "rgba(255,255,255,0.52)",
        fontSize: 11,
    },
    membersDrawerTitle: {
        ...typography.label,
        color: "rgba(255,255,255,0.52)",
    },
    membersEmptyText: {
        ...typography.body,
        color: "rgba(255,255,255,0.52)",
        marginTop: 6,
        paddingHorizontal: 14,
    },
    memberSubtext: {
        ...typography.body,
        color: "rgba(255,255,255,0.52)",
        fontSize: 10,
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

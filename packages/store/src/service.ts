/**
 * VexService — the sole gateway between UI components and the Vex protocol.
 *
 * Privately owns the Client instance. Components never access Client directly.
 * All state mutations go through this service → writable atoms.
 * Components subscribe to readonly atom exports from domains/.
 */
import type {
    ClientOptions,
    Invite,
    KeyStore,
    Logger,
    Message,
    Storage,
    User,
} from "@vex-chat/libvex";

import { Client } from "@vex-chat/libvex";

import {
    $avatarHashWritable,
    $devicesWritable,
    $familiarsWritable,
    $keyReplacedWritable,
    $userWritable,
} from "./domains/identity.ts";
import {
    $channelUnreadCountsWritable,
    $dmUnreadCountsWritable,
    $groupMessagesWritable,
    $messagesWritable,
} from "./domains/messaging.ts";
import {
    $channelsWritable,
    $onlineListsWritable,
    $permissionsWritable,
    $serversWritable,
} from "./domains/servers.ts";

// ── Public types ────────────────────────────────────────────────────────────

/** Result from any auth flow. */
export interface AuthResult {
    error?: string;
    keyReplaced?: boolean;
    ok: boolean;
}

/** App-provided platform configuration for client bootstrap. */
export interface BootstrapConfig {
    createStorage(
        dbName: string,
        privateKey: string,
        logger: Logger,
    ): Promise<Storage>;
    deviceName: string;
    logger: Logger;
}

/** Result from any mutation operation. */
export interface OperationResult {
    error?: string;
    ok: boolean;
}

/** Server connection options — identical across all auth flows. */
export interface ServerOptions {
    host: string;
    inMemoryDb?: boolean;
    logLevel?:
        | "debug"
        | "error"
        | "http"
        | "info"
        | "silly"
        | "verbose"
        | "warn";
    unsafeHttp?: boolean;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

class VexService {
    private client: Client | null = null;

    // ── Auth flows ──────────────────────────────────────────────────────

    /**
     * Auto-login from stored credentials → connect.
     * Returns { ok: false } if no credentials found.
     */
    async autoLogin(
        keyStore: KeyStore,
        config: BootstrapConfig,
        options: ServerOptions,
    ): Promise<AuthResult> {
        console.log("[vex-store] autoLogin: loading keyStore...");
        let creds;
        try {
            creds = await keyStore.load();
        } catch (loadErr: unknown) {
            console.error("[vex-store] autoLogin: keyStore.load() threw:", loadErr);
            return { error: errorMessage(loadErr), ok: false };
        }
        if (!creds) {
            console.log("[vex-store] autoLogin: no creds found, returning ok:false");
            return { ok: false };
        }
        console.log("[vex-store] autoLogin: creds found for", creds.username);

        try {
            console.log("[vex-store] autoLogin: initClient...");
            await this.initClient(creds.deviceKey, config, options);
            const client = this.requireClient();
            console.log("[vex-store] autoLogin: client created, calling loginWithDeviceKey...");

            const authErr = await client.loginWithDeviceKey(creds.deviceID);
            console.log("[vex-store] autoLogin: loginWithDeviceKey result:", authErr?.message ?? "success");
            if (authErr) {
                console.log("[vex-store] autoLogin: auth failed, closing client...");
                try { await this.close(); } catch { /* ignore close errors */ }
                return { error: authErr.message, ok: false };
            }

            console.log("[vex-store] autoLogin: connecting...");
            await client.connect();
            $userWritable.set(client.me.user());
            console.log("[vex-store] autoLogin: populating state...");
            await this.populateState();
            console.log("[vex-store] autoLogin: done, ok:true");
            return { ok: true };
        } catch (err: unknown) {
            console.error("[vex-store] autoLogin: caught error:", errorMessage(err));
            try { await this.close(); } catch { /* ignore close errors */ }
            if ($keyReplacedWritable.get()) {
                return { keyReplaced: true, ok: false };
            }
            return { error: errorMessage(err), ok: false };
        }
    }

    async close(): Promise<void> {
        if (this.client) {
            await this.client.close(true);
            this.client = null;
        }
    }

    async createChannel(
        name: string,
        serverID: string,
    ): Promise<OperationResult> {
        try {
            const client = this.requireClient();
            await client.channels.create(name, serverID);
            const channels = await client.channels.retrieve(serverID);
            $channelsWritable.setKey(serverID, channels);
            return { ok: true };
        } catch (err: unknown) {
            return { error: errorMessage(err), ok: false };
        }
    }

    // ── Server CRUD ─────────────────────────────────────────────────────

    async createInvite(serverID: string, duration: string): Promise<Invite> {
        const client = this.requireClient();
        return client.invites.create(serverID, duration);
    }

    async createServer(name: string): Promise<OperationResult> {
        try {
            const client = this.requireClient();
            const server = await client.servers.create(name);
            $serversWritable.setKey(server.serverID, server);
            const channels = await client.channels.retrieve(server.serverID);
            $channelsWritable.setKey(server.serverID, channels);
            return { ok: true };
        } catch (err: unknown) {
            return { error: errorMessage(err), ok: false };
        }
    }

    async deleteServer(serverID: string): Promise<OperationResult> {
        try {
            const client = this.requireClient();
            await client.servers.delete(serverID);
            const servers = new Map(Object.entries($serversWritable.get()));
            servers.delete(serverID);
            $serversWritable.set(Object.fromEntries(servers));
            const channels = new Map(Object.entries($channelsWritable.get()));
            channels.delete(serverID);
            $channelsWritable.set(Object.fromEntries(channels));
            return { ok: true };
        } catch (err: unknown) {
            return { error: errorMessage(err), ok: false };
        }
    }

    async getChannelMembers(channelID: string): Promise<User[]> {
        const client = this.requireClient();
        return client.channels.userList(channelID);
    }

    async getInvites(serverID: string): Promise<Invite[]> {
        const client = this.requireClient();
        return client.invites.retrieve(serverID);
    }

    // ── Channel operations ──────────────────────────────────────────────

    async joinInvite(inviteID: string): Promise<OperationResult> {
        try {
            const client = this.requireClient();
            const permission = await client.invites.redeem(inviteID);
            const server = await client.servers.retrieveByID(
                permission.resourceID,
            );
            if (!server) {
                return { error: "Server not found", ok: false };
            }
            $serversWritable.setKey(server.serverID, server);
            const channels = await client.channels.retrieve(server.serverID);
            $channelsWritable.setKey(server.serverID, channels);
            return { ok: true };
        } catch (err: unknown) {
            return { error: errorMessage(err), ok: false };
        }
    }

    /**
     * Login with username/password → register device if needed → connect.
     */
    async login(
        username: string,
        password: string,
        config: BootstrapConfig,
        options: ServerOptions,
        keyStore: KeyStore,
    ): Promise<AuthResult> {
        try {
            const creds = await keyStore.load(username);
            const privateKey = creds?.deviceKey ?? Client.generateSecretKey();

            await this.initClient(privateKey, config, options);
            const client = this.requireClient();

            const loginResult = await client.login(username, password);
            if (!loginResult.ok) {
                return {
                    error: loginResult.error ?? "Invalid username or password",
                    ok: false,
                };
            }

            await client.connect();
            $userWritable.set(client.me.user());

            if (!creds) {
                this.log(
                    "No saved creds for " +
                        username +
                        " — registering new device",
                );
                try {
                    await client.devices.register();
                    this.log(
                        "Device registered: " + client.me.device().deviceID,
                    );
                } catch (regErr: unknown) {
                    // 470 = device with this signing key already exists — reuse it
                    if (!this.isDeviceExistsError(regErr)) {
                        this.log(
                            "Device registration failed: " +
                                errorMessage(regErr),
                        );
                    }
                }
                await this.saveCredentials(keyStore, {
                    deviceID: client.me.device().deviceID,
                    deviceKey: privateKey,
                    token: "",
                    username,
                });
            } else {
                try {
                    await keyStore.save({ ...creds, token: "" });
                } catch {
                    /* non-fatal token update */
                }
            }

            await this.populateState();
            return { ok: true };
        } catch (err: unknown) {
            return { error: errorMessage(err), ok: false };
        }
    }

    // ── Messaging ───────────────────────────────────────────────────────

    async logout(): Promise<void> {
        await this.close();
        this.resetAll();
    }

    async lookupUser(query: string): Promise<null | User> {
        try {
            const client = this.requireClient();
            const [user] = await client.users.retrieve(query);
            return user;
        } catch {
            return null;
        }
    }

    // ── User operations ─────────────────────────────────────────────────

    markRead(conversationKey: string): void {
        $dmUnreadCountsWritable.setKey(conversationKey, 0);
        $channelUnreadCountsWritable.setKey(conversationKey, 0);
    }

    /**
     * Register a new account → save credentials → connect.
     */
    async register(
        username: string,
        password: string,
        config: BootstrapConfig,
        options: ServerOptions,
        keyStore: KeyStore,
    ): Promise<AuthResult> {
        try {
            const privateKey = Client.generateSecretKey();
            await this.initClient(privateKey, config, options);
            const client = this.requireClient();

            const [user, regErr] = await client.register(username, password);
            if (regErr || !user) {
                return {
                    error: regErr?.message ?? "Registration failed",
                    ok: false,
                };
            }

            const loginResult = await client.login(username, password);
            if (!loginResult.ok) {
                return {
                    error:
                        "Registered but login failed: " +
                        (loginResult.error ?? "unknown"),
                    ok: false,
                };
            }

            await client.connect();
            $userWritable.set(client.me.user());

            await this.saveCredentials(keyStore, {
                deviceID: client.me.device().deviceID,
                deviceKey: privateKey,
                token: "",
                username,
            });

            await this.populateState();
            return { ok: true };
        } catch (err: unknown) {
            return { error: errorMessage(err), ok: false };
        }
    }

    // ── Unread management ───────────────────────────────────────────────

    resetAllUnread(): void {
        $dmUnreadCountsWritable.set({});
        $channelUnreadCountsWritable.set({});
    }

    async sendDM(
        recipientID: string,
        content: string,
    ): Promise<OperationResult> {
        try {
            const client = this.requireClient();
            await client.messages.send(recipientID, content);
            return { ok: true };
        } catch (err: unknown) {
            return { error: errorMessage(err), ok: false };
        }
    }

    // ── Lifecycle ───────────────────────────────────────────────────────

    async sendGroupMessage(
        channelID: string,
        content: string,
    ): Promise<OperationResult> {
        try {
            const client = this.requireClient();
            await client.messages.group(channelID, content);
            return { ok: true };
        } catch (err: unknown) {
            return { error: errorMessage(err), ok: false };
        }
    }

    async setAvatar(data: Uint8Array): Promise<OperationResult> {
        try {
            const client = this.requireClient();
            await client.me.setAvatar(data);
            $avatarHashWritable.set(Date.now());
            return { ok: true };
        } catch (err: unknown) {
            return { error: errorMessage(err), ok: false };
        }
    }

    // ── Private ─────────────────────────────────────────────────────────

    private async initClient(
        privateKey: string,
        config: BootstrapConfig,
        options: ServerOptions,
    ): Promise<void> {
        this.resetAll();

        const storage = await config.createStorage(
            "vex-client.db",
            privateKey,
            config.logger,
        );

        const clientOptions: ClientOptions = {
            ...options,
            deviceName: config.deviceName,
            logger: config.logger,
        };

        this.client = await Client.create(privateKey, clientOptions, storage);
        this.wireEvents();
    }

    private isDeviceExistsError(err: unknown): boolean {
        if (
            err instanceof Error &&
            "response" in err &&
            typeof (err as Record<string, unknown>)["response"] === "object"
        ) {
            const response = (err as Record<string, unknown>)["response"] as
                | undefined
                | { status?: number };
            return response?.status === 470;
        }
        return false;
    }

    private log(message: string): void {
        const logger = this.client
            ? // @ts-expect-error -- accessing internal logger for debug output
              (this.client as { log?: Logger }).log
            : undefined;
        if (logger) {
            logger.warn("[vex-store] " + message);
        } else {
            console.warn("[vex-store] " + message);
        }
    }

    private async populateState(): Promise<void> {
        const client = this.requireClient();
        try {
            const servers = await client.servers.retrieve();
            for (const server of servers) {
                $serversWritable.setKey(server.serverID, server);
                const channels = await client.channels.retrieve(
                    server.serverID,
                );
                $channelsWritable.setKey(server.serverID, channels);

                for (const channel of channels) {
                    try {
                        const msgs = await client.messages.retrieveGroup(
                            channel.channelID,
                        );
                        if (msgs.length > 0) {
                            $groupMessagesWritable.setKey(
                                channel.channelID,
                                deduplicateMessages(msgs),
                            );
                        }
                    } catch {
                        /* non-fatal */
                    }
                }
            }

            const perms = await client.permissions.retrieve();
            for (const perm of perms) {
                $permissionsWritable.setKey(perm.permissionID, perm);
            }

            try {
                const familiars = await client.users.familiars();
                for (const user of familiars) {
                    $familiarsWritable.setKey(user.userID, user);
                    try {
                        const msgs = await client.messages.retrieve(
                            user.userID,
                        );
                        if (msgs.length > 0) {
                            $messagesWritable.setKey(
                                user.userID,
                                deduplicateMessages(msgs),
                            );
                        }
                    } catch {
                        /* non-fatal */
                    }
                }
            } catch {
                /* non-fatal */
            }
        } catch {
            /* non-fatal — UI will show empty state */
        }
    }

    private requireClient(): Client {
        if (!this.client) throw new Error("Not authenticated");
        return this.client;
    }

    private resetAll(): void {
        this.client = null;
        $userWritable.set(null);
        $keyReplacedWritable.set(false);
        $familiarsWritable.set({});
        $devicesWritable.set({});
        $avatarHashWritable.set(0);
        $messagesWritable.set({});
        $groupMessagesWritable.set({});
        $dmUnreadCountsWritable.set({});
        $channelUnreadCountsWritable.set({});
        $serversWritable.set({});
        $channelsWritable.set({});
        $permissionsWritable.set({});
        $onlineListsWritable.set({});
    }

    private async saveCredentials(
        keyStore: KeyStore,
        creds: {
            deviceID: string;
            deviceKey: string;
            token: string;
            username: string;
        },
    ): Promise<void> {
        try {
            this.log(
                "Saving creds: " +
                    JSON.stringify({
                        deviceID: creds.deviceID,
                        username: creds.username,
                    }),
            );
            await keyStore.save(creds);
            this.log("Creds saved successfully");
        } catch (err: unknown) {
            this.log("keyStore.save failed: " + errorMessage(err));
        }
    }

    private wireEvents(): void {
        const client = this.requireClient();

        client.on("message", (msg: Message) => {
            const me = $userWritable.get();

            if (msg.group) {
                const prev = $groupMessagesWritable.get()[msg.group] ?? [];
                if (!prev.some((m) => m.mailID === msg.mailID)) {
                    $groupMessagesWritable.setKey(msg.group, [...prev, msg]);
                    if (me && msg.authorID !== me.userID) {
                        const count =
                            ($channelUnreadCountsWritable.get()[msg.group] ??
                                0) + 1;
                        $channelUnreadCountsWritable.setKey(msg.group, count);
                    }
                }
            } else {
                const isOwnMessage = me && msg.authorID === me.userID;
                const threadKey = isOwnMessage ? msg.readerID : msg.authorID;
                const prev = $messagesWritable.get()[threadKey] ?? [];

                if (!prev.some((m) => m.mailID === msg.mailID)) {
                    $messagesWritable.setKey(threadKey, [...prev, msg]);
                    if (!isOwnMessage) {
                        const count =
                            ($dmUnreadCountsWritable.get()[threadKey] ?? 0) + 1;
                        $dmUnreadCountsWritable.setKey(threadKey, count);
                    }

                    const otherUserID = threadKey;
                    if (!$familiarsWritable.get()[otherUserID]) {
                        $familiarsWritable.setKey(otherUserID, {
                            lastSeen: new Date(),
                            userID: otherUserID,
                            username: otherUserID.slice(0, 8),
                        } as User);
                        client.users
                            .retrieve(otherUserID)
                            .then(([u]) => {
                                if (u)
                                    $familiarsWritable.setKey(otherUserID, u);
                            })
                            .catch(() => {});
                    }
                }
            }
        });
    }
}

function deduplicateMessages(messages: Message[]): Message[] {
    const seen = new Set<string>();
    return messages.filter((m) => {
        if (seen.has(m.mailID)) return false;
        seen.add(m.mailID);
        return true;
    });
}

// ── VexService ──────────────────────────────────────────────────────────────

function errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}

export const vexService = new VexService();

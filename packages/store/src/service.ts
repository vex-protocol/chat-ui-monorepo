/**
 * VexService — the sole gateway between UI components and the Vex protocol.
 *
 * Privately owns the Client instance. Components never access Client directly.
 * All state mutations go through this service → writable atoms.
 * Components subscribe to readonly atom exports from domains/.
 */
import type {
    Channel,
    ClientEvents,
    ClientOptions,
    Invite,
    KeyStore,
    Message,
    Permission,
    Server,
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
    createStorage(dbName: string, privateKey: string): Promise<Storage>;
    deviceName: string;
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

interface HttpErrorLike {
    response: { status: number };
}

class Disposable {
    private fns: Array<() => void> = [];

    add(fn: () => void): void {
        this.fns.push(fn);
    }

    dispose(): void {
        const fns = this.fns;
        this.fns = [];
        for (const fn of fns) {
            try {
                fn();
            } catch (e: unknown) {
                console.error("[vex-store] disposer threw", e);
            }
        }
    }
}

class VexService {
    private client: Client | null = null;
    private readonly disposable = new Disposable();
    private readonly failedUserLookups = new Set<string>();

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
        let creds;
        try {
            creds = await keyStore.load();
        } catch (loadErr: unknown) {
            return { error: errorMessage(loadErr), ok: false };
        }
        if (!creds) return { ok: false };

        try {
            await this.initClient(creds.deviceKey, config, options);
            const client = this.requireClient();

            const authErr = await client.loginWithDeviceKey(creds.deviceID);
            if (authErr) {
                await this.close();
                return { error: authErr.message, ok: false };
            }

            await client.connect();
            $userWritable.set(client.me.user());
            await this.populateState();
            return { ok: true };
        } catch (err: unknown) {
            try {
                await this.close();
            } catch {
                /* ignore close errors */
            }
            if ($keyReplacedWritable.get()) {
                return { keyReplaced: true, ok: false };
            }
            return { error: errorMessage(err), ok: false };
        }
    }

    async close(): Promise<void> {
        if (this.client) {
            const c = this.client;
            this.unwireEvents();
            this.client = null;
            try {
                await c.close(true);
            } catch {
                // Ignore close errors — the Client may have a
                // half-open WebSocket that throws on teardown.
            }
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

    /** Delete all local data — message history, sessions, keys. Credentials (keychain) cleared by consumer. */
    async deleteAllData(): Promise<void> {
        if (this.client) {
            try {
                await this.client.deleteAllData();
            } catch {
                /* ignore — may fail if not connected */
            }
        }
        this.client = null;
        this.resetAll();
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

    // ── Channel operations ──────────────────────────────────────────────

    async getInvites(serverID: string): Promise<Invite[]> {
        const client = this.requireClient();
        return client.invites.retrieve(serverID);
    }

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

    // ── Messaging ───────────────────────────────────────────────────────

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
                try {
                    await client.devices.register();
                } catch (regErr: unknown) {
                    // 470 = device with this signing key already exists — reuse it
                    if (!this.isDeviceExistsError(regErr)) {
                        await this.close();
                        this.resetAll();
                        return { error: errorMessage(regErr), ok: false };
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

    private ensureFamiliarCached(userID: string): void {
        if ($familiarsWritable.get()[userID]) return;
        if (this.failedUserLookups.has(userID)) return;

        $familiarsWritable.setKey(userID, {
            lastSeen: new Date().toISOString(),
            userID,
            username: userID.slice(0, 8),
        });

        const client = this.client;
        if (!client) return;
        client.users
            .retrieve(userID)
            .then(([u]) => {
                if (u) {
                    $familiarsWritable.setKey(userID, u);
                } else {
                    this.failedUserLookups.add(userID);
                }
            })
            .catch(() => {
                this.failedUserLookups.add(userID);
            });
    }

    private handleDirectMessage(msg: Message): void {
        const me = $userWritable.get();
        const isOwnMessage = Boolean(me && msg.authorID === me.userID);
        const threadKey = isOwnMessage ? msg.readerID : msg.authorID;
        const prev = $messagesWritable.get()[threadKey] ?? [];
        if (prev.some((m) => m.mailID === msg.mailID)) return;

        $messagesWritable.setKey(threadKey, [...prev, msg]);

        if (!isOwnMessage) {
            const count = ($dmUnreadCountsWritable.get()[threadKey] ?? 0) + 1;
            $dmUnreadCountsWritable.setKey(threadKey, count);
        }

        this.ensureFamiliarCached(threadKey);
    }

    private handleGroupMessage(msg: Message, channelID: string): void {
        const prev = $groupMessagesWritable.get()[channelID] ?? [];
        if (prev.some((m) => m.mailID === msg.mailID)) return;

        $groupMessagesWritable.setKey(channelID, [...prev, msg]);

        const me = $userWritable.get();
        if (me && msg.authorID !== me.userID) {
            const count =
                ($channelUnreadCountsWritable.get()[channelID] ?? 0) + 1;
            $channelUnreadCountsWritable.setKey(channelID, count);
        }
    }

    private async initClient(
        privateKey: string,
        config: BootstrapConfig,
        options: ServerOptions,
    ): Promise<void> {
        await this.close();
        this.resetAll();

        const storage = await config.createStorage("vex-client.db", privateKey);

        const clientOptions: ClientOptions = {
            ...options,
            deviceName: config.deviceName,
        };

        this.client = await Client.create(privateKey, clientOptions, storage);
        this.wireEvents();
    }

    private isDeviceExistsError(err: unknown): boolean {
        return hasHttpStatus(err) && err.response.status === 470;
    }

    private async populateState(): Promise<void> {
        const client = this.requireClient();

        const serversAcc: Record<string, Server> = {};
        const channelsAcc: Record<string, Channel[]> = {};
        const groupMessagesAcc: Record<string, Message[]> = {};
        const permsAcc: Record<string, Permission> = {};
        const familiarsAcc: Record<string, User> = {};
        const messagesAcc: Record<string, Message[]> = {};

        const loadServer = async (server: Server): Promise<void> => {
            serversAcc[server.serverID] = server;
            const channels = await client.channels.retrieve(server.serverID);
            channelsAcc[server.serverID] = channels;

            await Promise.all(
                channels.map(async (channel) => {
                    try {
                        const msgs = await client.messages.retrieveGroup(
                            channel.channelID,
                        );
                        if (msgs.length > 0) {
                            groupMessagesAcc[channel.channelID] =
                                deduplicateMessages(msgs);
                        }
                    } catch {
                        /* non-fatal */
                    }
                }),
            );
        };

        const loadFamiliar = async (user: User): Promise<void> => {
            familiarsAcc[user.userID] = user;
            try {
                const msgs = await client.messages.retrieve(user.userID);
                if (msgs.length > 0) {
                    messagesAcc[user.userID] = deduplicateMessages(msgs);
                }
            } catch {
                /* non-fatal */
            }
        };

        try {
            const [servers, perms, familiars] = await Promise.all([
                client.servers.retrieve(),
                client.permissions.retrieve().catch(() => [] as Permission[]),
                client.users.familiars().catch(() => [] as User[]),
            ]);

            for (const perm of perms) {
                permsAcc[perm.permissionID] = perm;
            }

            await Promise.all([
                ...servers.map((s) => loadServer(s)),
                ...familiars.map((u) => loadFamiliar(u)),
            ]);

            $serversWritable.set(serversAcc);
            $channelsWritable.set(channelsAcc);
            $groupMessagesWritable.set(groupMessagesAcc);
            $permissionsWritable.set(permsAcc);
            $familiarsWritable.set(familiarsAcc);
            $messagesWritable.set(messagesAcc);
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
        this.failedUserLookups.clear();
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
            await keyStore.save(creds);
        } catch {
            /* ignore — keystore failures are non-fatal here */
        }
    }

    private subscribe<E extends keyof ClientEvents>(
        evt: E,
        fn: ClientEvents[E],
    ): void {
        const client = this.requireClient();
        client.on(evt, fn);
        this.disposable.add(() => {
            this.client?.off(evt, fn);
        });
    }

    private unwireEvents(): void {
        this.disposable.dispose();
    }

    private wireEvents(): void {
        this.subscribe("message", (msg) => {
            if (msg.group) {
                this.handleGroupMessage(msg, msg.group);
            } else {
                this.handleDirectMessage(msg);
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

function errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}

// ── VexService ──────────────────────────────────────────────────────────────

function hasHttpStatus(err: unknown): err is HttpErrorLike {
    if (!(err instanceof Error) || !("response" in err)) return false;
    const res = (err as { response: unknown }).response;
    return (
        typeof res === "object" &&
        res !== null &&
        "status" in res &&
        typeof (res as { status: unknown }).status === "number"
    );
}

export const vexService = new VexService();

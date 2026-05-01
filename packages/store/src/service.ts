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
    Device,
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
    $authStatusWritable,
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

export type AuthProbeStatus = "authenticated" | "offline" | "unauthorized";
/** Result from any auth flow. */
export interface AuthResult {
    error?: string;
    keyReplaced?: boolean;
    ok: boolean;
    pendingDeviceApproval?: boolean;
    pendingRequestID?: string;
}

export type BackgroundNetworkFetchResult = "failed" | "new_data" | "no_data";

/** App-provided platform configuration for client bootstrap. */
export interface BootstrapConfig {
    /**
     * Open (or create) per-identity local storage. Platforms compose the
     * final file path from `username` + the configured server host so each
     * identity on each server owns an isolated encrypted DB. Switching
     * between identities is non-destructive; sealed columns stay paired
     * with the deviceKey that encrypted them.
     */
    createStorage(privateKey: string, username: string): Promise<Storage>;
    deviceName: string;
}

export interface CreateServerResult extends OperationResult {
    channelID?: string;
    channelName?: string;
    serverID?: string;
    serverName?: string;
}

export interface DeviceApprovalRequest {
    approvedDeviceID?: string;
    createdAt: string;
    deviceName: string;
    error?: string;
    expiresAt: string;
    requestID: string;
    signKey: string;
    status: "approved" | "expired" | "pending" | "rejected";
    username: string;
}

/** Result from any mutation operation. */
export interface OperationResult {
    error?: string;
    ok: boolean;
}

export type ResumeNetworkStatus = "signed_out" | AuthProbeStatus;

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

export interface SessionInfo {
    authStatus:
        | "authenticated"
        | "checking"
        | "offline"
        | "signed_out"
        | "unauthorized";
    deviceID: string;
    tokenExp?: number;
    tokenExpiresAt?: string;
    tokenRemainingHours?: number;
    userID: string;
    username: string;
}

interface ClientHttpDefaultsLike {
    signal?: unknown;
    timeout?: number;
}

interface ClientHttpInterceptorsLike {
    request?: {
        use?: (
            onFulfilled: (
                config: ClientHttpRequestConfigLike,
            ) => ClientHttpRequestConfigLike,
        ) => unknown;
    };
}

interface ClientHttpLike {
    defaults?: ClientHttpDefaultsLike;
    get?: (...args: unknown[]) => Promise<unknown>;
    interceptors?: ClientHttpInterceptorsLike;
    post?: (...args: unknown[]) => Promise<unknown>;
}

interface ClientHttpRequestConfigLike {
    signal?: unknown;
    timeout?: number;
}

type ClientWithDeviceApprovals = Omit<Client, "devices"> & {
    devices: DevicesWithApprovalLike;
};

interface ClientWithInternalHttp {
    http?: ClientHttpLike;
}

interface ClientWithSocketLike {
    socket?: unknown;
}

interface ClientWithSyncInboxLike {
    syncInboxNow?: unknown;
}

interface ClientWithUserDeviceListLike {
    getUserDeviceList?: (userID: string) => Promise<Device[] | null>;
}

interface DevicesWithApprovalLike {
    approveRequest?: (requestID: string) => Promise<unknown>;
    delete: (deviceID: string) => Promise<void>;
    getRequest?: (requestID: string) => Promise<DeviceApprovalRequest | null>;
    listRequests?: () => Promise<DeviceApprovalRequest[]>;
    register: () => Promise<unknown>;
    rejectRequest?: (requestID: string) => Promise<unknown>;
    retrieve: (
        deviceIdentifier: string,
    ) => Promise<null | { deviceID: string }>;
}

interface HttpErrorLike {
    response: { status: number };
}

interface WebSocketDebugLike {
    off(event: "message", listener: (data: Uint8Array) => void): void;
    on(event: "message", listener: (data: Uint8Array) => void): void;
    send(data: Uint8Array): void;
}

const REGISTER_STEP_TIMEOUT_MS = 12000;
const DEVICE_AUTH_REFRESH_THRESHOLD_MS = 6 * 24 * 60 * 60 * 1000;
const DEVICE_AUTH_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

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
    private connectionRecoveryInFlight = false;
    private readonly deviceRequestQueueListeners = new Set<() => void>();
    private readonly disposable = new Disposable();
    private readonly failedUserLookups = new Set<string>();
    private lastConnectionRecoveryAt = 0;
    private lastDeviceAuthRefreshAttemptAt = 0;
    private pendingApprovalWatchCancel: (() => void) | null = null;
    private pendingRateLimitNotice = false;
    private wsDebugEnabled = shouldDebugAuth();
    private wsDebugFrameLogsEnabled = shouldDebugAuth();
    private wsDebugInboundListener: ((data: Uint8Array) => void) | null = null;
    private wsDebugOriginalSend: ((data: Uint8Array) => void) | null = null;
    private wsDebugSocket: null | WebSocketDebugLike = null;
    private wsDebugStateLogsEnabled = shouldDebugAuth();

    // ── Auth flows ──────────────────────────────────────────────────────

    async approveDeviceRequest(requestID: string): Promise<OperationResult> {
        try {
            const client =
                this.requireClient() as unknown as ClientWithDeviceApprovals;
            if (!client.devices.approveRequest) {
                return {
                    error: "Client does not support device approvals yet.",
                    ok: false,
                };
            }
            await client.devices.approveRequest(requestID);
            return { ok: true };
        } catch (err: unknown) {
            return { error: errorMessage(err), ok: false };
        }
    }

    /**
     * Auto-login from stored credentials → connect.
     * Returns { ok: false } if no credentials found.
     */
    async autoLogin(
        keyStore: KeyStore,
        config: BootstrapConfig,
        options: ServerOptions,
    ): Promise<AuthResult> {
        this.setAuthStatus("checking");
        debugAuth("autoLogin:start", { host: options.host });
        let creds;
        try {
            creds = await keyStore.load();
        } catch (loadErr: unknown) {
            return { error: errorMessage(loadErr), ok: false };
        }
        if (!creds) {
            this.setAuthStatus("signed_out");
            return { ok: false };
        }

        try {
            await this.initClient(
                creds.deviceKey,
                creds.username,
                config,
                options,
            );
            debugAuth("autoLogin:initClient:ok", {
                host: options.host,
                username: creds.username,
            });
            const client = this.requireClient();

            const authErr = await this.loginWithDeviceKeyWithRetry(
                client,
                creds.deviceID,
            );
            if (authErr) {
                await this.close();
                if (isUnauthorizedError(authErr)) {
                    debugAuth("autoLogin:unauthorized:clearingCredentials", {
                        username: creds.username,
                    });
                    await this.clearStoredCredentials(keyStore, creds.username);
                    this.setAuthStatus("unauthorized");
                    return {
                        error: "Session expired. Please sign in again.",
                        ok: false,
                    };
                }
                return { error: authErr.message, ok: false };
            }

            await client.connect();
            $userWritable.set(client.me.user());
            this.setAuthStatus("authenticated");
            await this.populateState();
            return { ok: true };
        } catch (err: unknown) {
            if (isDecryptMismatchError(err)) {
                debugAuth("autoLogin:decrypt-mismatch:recover:start", {
                    username: creds.username,
                });
                try {
                    await this.initClient(
                        creds.deviceKey,
                        creds.username,
                        config,
                        options,
                        true,
                    );
                    const recovered = this.requireClient();
                    const authErr = await this.loginWithDeviceKeyWithRetry(
                        recovered,
                        creds.deviceID,
                    );
                    if (authErr) {
                        await this.close();
                        if (isUnauthorizedError(authErr)) {
                            debugAuth(
                                "autoLogin:decrypt-mismatch:recover:unauthorized:clearingCredentials",
                                { username: creds.username },
                            );
                            await this.clearStoredCredentials(
                                keyStore,
                                creds.username,
                            );
                            this.setAuthStatus("unauthorized");
                            return {
                                error: "Session expired. Please sign in again.",
                                ok: false,
                            };
                        }
                        return { error: authErr.message, ok: false };
                    }

                    await recovered.connect();
                    $userWritable.set(recovered.me.user());
                    this.setAuthStatus("authenticated");
                    await this.populateState();
                    debugAuth("autoLogin:decrypt-mismatch:recover:ok", {
                        username: creds.username,
                    });
                    return { ok: true };
                } catch (recoveryErr: unknown) {
                    try {
                        await this.close();
                    } catch {
                        /* ignore close errors */
                    }
                    debugAuth("autoLogin:decrypt-mismatch:recover:failed", {
                        message: errorMessage(recoveryErr),
                        username: creds.username,
                    });
                    return {
                        error: "Local encrypted data could not be recovered on this device. Please sign in again.",
                        ok: false,
                    };
                }
            }
            try {
                await this.close();
            } catch {
                /* ignore close errors */
            }
            if (isUnauthorizedError(err)) {
                debugAuth("autoLogin:catch:unauthorized:clearingCredentials", {
                    username: creds.username,
                });
                await this.clearStoredCredentials(keyStore, creds.username);
                this.setAuthStatus("unauthorized");
                return {
                    error: "Session expired. Please sign in again.",
                    ok: false,
                };
            }
            if (isNetworkError(err)) {
                this.setAuthStatus("offline");
            }
            if ($keyReplacedWritable.get()) {
                return { keyReplaced: true, ok: false };
            }
            return { error: errorMessage(err), ok: false };
        }
    }

    async close(): Promise<void> {
        if (this.client) {
            this.detachWebsocketDebug();
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

    // ── Server CRUD ─────────────────────────────────────────────────────

    consumeRateLimitNotice(): boolean {
        if (!this.pendingRateLimitNotice) {
            return false;
        }
        this.pendingRateLimitNotice = false;
        return true;
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

    async createInvite(serverID: string, duration: string): Promise<Invite> {
        const client = this.requireClient();
        return client.invites.create(serverID, duration);
    }

    async createServer(name: string): Promise<CreateServerResult> {
        try {
            const client = this.requireClient();
            const server = await client.servers.create(name);
            $serversWritable.setKey(server.serverID, server);
            const channels = await client.channels.retrieve(server.serverID);
            $channelsWritable.setKey(server.serverID, channels);
            const firstChannel = channels[0];
            return {
                ok: true,
                serverID: server.serverID,
                serverName: server.name,
                ...(firstChannel
                    ? {
                          channelID: firstChannel.channelID,
                          channelName: firstChannel.name,
                      }
                    : {}),
            };
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

    deleteLocalMessage(
        conversationKey: string,
        mailID: string,
        isGroup: boolean,
    ): boolean {
        const writable = isGroup ? $groupMessagesWritable : $messagesWritable;
        const thread = writable.get()[conversationKey] ?? [];
        if (thread.length === 0) {
            return false;
        }
        const nextThread = thread.filter((msg) => msg.mailID !== mailID);
        if (nextThread.length === thread.length) {
            return false;
        }
        writable.setKey(conversationKey, nextThread);
        return true;
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

    async getDeviceRequest(
        requestID: string,
    ): Promise<DeviceApprovalRequest | null> {
        const client =
            this.requireClient() as unknown as ClientWithDeviceApprovals;
        if (typeof client.devices.getRequest === "function") {
            return client.devices.getRequest(requestID);
        }
        if (typeof client.devices.listRequests === "function") {
            const requests = await client.devices.listRequests();
            return (
                requests.find((request) => request.requestID === requestID) ??
                null
            );
        }
        return null;
    }

    async getInvites(serverID: string): Promise<Invite[]> {
        const client = this.requireClient();
        return client.invites.retrieve(serverID);
    }

    async getSessionInfo(): Promise<null | SessionInfo> {
        try {
            const client = this.requireClient();
            const user = client.me.user();
            const device = client.me.device();
            let tokenExp: number | undefined;
            try {
                const auth = await client.whoami();
                tokenExp = auth.exp;
            } catch {
                // If whoami fails we can still return local session metadata.
            }
            const expMs =
                typeof tokenExp === "number"
                    ? jwtExpToEpochMs(tokenExp)
                    : undefined;
            const remainingMs =
                typeof expMs === "number"
                    ? Math.max(0, expMs - Date.now())
                    : undefined;
            return {
                authStatus: $authStatusWritable.get(),
                deviceID: device.deviceID,
                userID: user.userID,
                username: user.username,
                ...(typeof tokenExp === "number" ? { tokenExp } : {}),
                ...(typeof expMs === "number"
                    ? { tokenExpiresAt: new Date(expMs).toISOString() }
                    : {}),
                ...(typeof remainingMs === "number"
                    ? {
                          tokenRemainingHours: Math.floor(
                              remainingMs / (1000 * 60 * 60),
                          ),
                      }
                    : {}),
            };
        } catch {
            return null;
        }
    }

    // ── Messaging ───────────────────────────────────────────────────────

    getWebsocketDebugEnabled(): boolean {
        return this.wsDebugEnabled;
    }

    getWebsocketFrameDebugEnabled(): boolean {
        return this.wsDebugFrameLogsEnabled;
    }

    getWebsocketStateDebugEnabled(): boolean {
        return this.wsDebugStateLogsEnabled;
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

    async listMyDevices(): Promise<Device[]> {
        const client = this.requireClient();
        const userID = client.me.user().userID;
        const withList = client as unknown as ClientWithUserDeviceListLike;
        let devices: Device[] = [];
        if (typeof withList.getUserDeviceList === "function") {
            devices = (await withList.getUserDeviceList(userID)) ?? [];
        }
        const sorted = [...devices].sort(
            (a, b) =>
                new Date(b.lastLogin).getTime() -
                new Date(a.lastLogin).getTime(),
        );
        $devicesWritable.setKey(userID, sorted);
        return sorted;
    }

    async listPendingDeviceRequests(): Promise<DeviceApprovalRequest[]> {
        const client =
            this.requireClient() as unknown as ClientWithDeviceApprovals;
        if (!client.devices.listRequests) {
            return [];
        }
        return client.devices.listRequests();
    }

    /**
     * Login with stored device key → register device if needed → connect.
     */
    async login(
        username: string,
        _password: string,
        config: BootstrapConfig,
        options: ServerOptions,
        keyStore: KeyStore,
    ): Promise<AuthResult> {
        this.setAuthStatus("checking");
        debugAuth("login:start", { host: options.host, username });
        try {
            const creds = await keyStore.load(username);
            const privateKey = creds?.deviceKey ?? Client.generateSecretKey();

            await this.initClient(
                privateKey,
                username,
                config,
                options,
                !creds,
            );
            debugAuth("login:initClient:ok", { host: options.host, username });
            const client = this.requireClient();

            if (!creds) {
                return {
                    error: "No local device key found for this username. Register this device first.",
                    ok: false,
                };
            }
            const authErr = await client.loginWithDeviceKey(creds.deviceID);
            debugAuth("login:device-key:done", {
                error: authErr?.message ?? null,
                ok: !authErr,
            });
            if (authErr) {
                return { error: authErr.message, ok: false };
            }

            try {
                await keyStore.save({ ...creds, token: "" });
            } catch {
                /* non-fatal token update */
            }

            await client.connect();
            $userWritable.set(client.me.user());
            this.setAuthStatus("authenticated");
            await this.populateState();
            return { ok: true };
        } catch (err: unknown) {
            if (isUnauthorizedError(err)) {
                this.setAuthStatus("unauthorized");
            } else if (isNetworkError(err)) {
                this.setAuthStatus("offline");
            }
            return { error: errorMessage(err), ok: false };
        }
    }

    async logout(): Promise<void> {
        this.stopPendingApprovalWatcher();
        await this.close();
        this.resetAll();
        this.setAuthStatus("signed_out");
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

    markRead(conversationKey: string): void {
        $dmUnreadCountsWritable.setKey(conversationKey, 0);
        $channelUnreadCountsWritable.setKey(conversationKey, 0);
    }

    onDeviceRequestQueueChanged(listener: () => void): () => void {
        this.deviceRequestQueueListeners.add(listener);
        return () => {
            this.deviceRequestQueueListeners.delete(listener);
        };
    }

    // ── User operations ─────────────────────────────────────────────────

    async probeAuthSession(): Promise<AuthProbeStatus> {
        try {
            const client = this.requireClient();
            const auth = await client.whoami();
            $userWritable.set(auth.user);
            await this.refreshSessionTokenIfStale(auth.exp);
            this.setAuthStatus("authenticated");
            return "authenticated";
        } catch (err: unknown) {
            if (isRateLimitedError(err)) {
                // 429 should not cascade into forced logout flows.
                this.markRateLimited("probeAuthSession");
                this.setAuthStatus("authenticated");
                return "authenticated";
            }
            if (isUnauthorizedError(err)) {
                this.setAuthStatus("unauthorized");
                return "unauthorized";
            }
            this.setAuthStatus("offline");
            return "offline";
        }
    }

    async refreshSessionAfterForeground(): Promise<ResumeNetworkStatus> {
        if (!this.client) {
            this.setAuthStatus("signed_out");
            return "signed_out";
        }
        this.setAuthStatus("checking");
        const probe = await this.probeAuthSession();
        if (probe === "unauthorized") {
            const client = this.requireClient();
            const authErr = await this.loginWithDeviceKeyWithRetry(client);
            if (authErr) {
                this.setAuthStatus("unauthorized");
                return "unauthorized";
            }
            const afterRelogin = await this.probeAuthSession();
            if (afterRelogin !== "authenticated") {
                return afterRelogin;
            }
        } else if (probe !== "authenticated") {
            return probe;
        }

        try {
            await withTimeout(
                this.client.reconnectWebsocket(),
                10_000,
                "WebSocket reconnect timed out after app resume.",
            );
            // reconnectWebsocket() swaps the underlying socket object; re-bind
            // debug hooks so inbound/outbound frame logging continues.
            this.attachWebsocketDebug();
            if (hasSyncInboxNow(this.client)) {
                await withTimeout(
                    this.client.syncInboxNow(),
                    10_000,
                    "Inbox sync timed out after app resume.",
                );
            } else {
                await withTimeout(
                    this.populateState(),
                    10_000,
                    "State refresh timed out after app resume.",
                );
            }
            this.setAuthStatus("authenticated");
            return "authenticated";
        } catch (err: unknown) {
            if (isRateLimitedError(err)) {
                this.markRateLimited("refreshSessionAfterForeground");
                this.setAuthStatus("authenticated");
                return "authenticated";
            }
            if (isUnauthorizedError(err)) {
                this.setAuthStatus("unauthorized");
                return "unauthorized";
            }
            this.setAuthStatus("offline");
            return "offline";
        }
    }

    async refreshSessionTokenIfStale(exp: number): Promise<void> {
        const expMs = jwtExpToEpochMs(exp);
        if (!Number.isFinite(expMs)) {
            return;
        }
        const remainingMs = expMs - Date.now();
        if (remainingMs > DEVICE_AUTH_REFRESH_THRESHOLD_MS) {
            return;
        }
        const elapsedSinceAttempt =
            Date.now() - this.lastDeviceAuthRefreshAttemptAt;
        if (elapsedSinceAttempt < DEVICE_AUTH_REFRESH_INTERVAL_MS) {
            return;
        }
        this.lastDeviceAuthRefreshAttemptAt = Date.now();
        try {
            const client = this.requireClient();
            const authErr = await this.loginWithDeviceKeyWithRetry(client);
            if (authErr) {
                debugAuth("session:refresh:failed", {
                    message: authErr.message,
                });
                return;
            }
            debugAuth("session:refresh:ok", {
                remainingHours: Math.floor(remainingMs / (1000 * 60 * 60)),
            });
        } catch (err: unknown) {
            debugAuth("session:refresh:error", {
                message: errorMessage(err),
            });
        }
    }

    /**
     * Register a new account → save credentials → connect.
     */
    async register(
        username: string,
        _password: string,
        config: BootstrapConfig,
        options: ServerOptions,
        keyStore: KeyStore,
    ): Promise<AuthResult> {
        this.setAuthStatus("checking");
        debugAuth("register:start", { host: options.host, username });
        try {
            const privateKey = Client.generateSecretKey();
            debugAuth("register:initClient:begin", { host: options.host });
            await withTimeout(
                this.initClient(privateKey, username, config, options, true),
                REGISTER_STEP_TIMEOUT_MS,
                "Signup stalled while preparing local encrypted storage.",
            );
            debugAuth("register:initClient:ok", { host: options.host });
            const client = this.requireClient();
            const hasXKeyRing = Boolean(
                (client as unknown as { xKeyRing?: unknown }).xKeyRing,
            );
            debugAuth("register:precheck", { hasXKeyRing });
            if (!hasXKeyRing) {
                return {
                    error: "Local crypto keyring did not initialize. Please retry.",
                    ok: false,
                };
            }

            debugAuth("register:http:begin", {
                endpoint: `${options.host}/register`,
            });
            const registrationUsername =
                username.trim().length > 0
                    ? username.trim()
                    : Client.randomUsername();
            const ignoredPasswordForCompatibility = "";
            const [user, regErr] = await withTimeout(
                client.register(
                    registrationUsername,
                    ignoredPasswordForCompatibility,
                ),
                REGISTER_STEP_TIMEOUT_MS,
                `Signup stalled before reaching server registration at ${options.host}.`,
            );
            debugAuth("register:http:done", {
                hasUser: Boolean(user),
                regErr: regErr?.message ?? null,
            });
            if (regErr || !user) {
                return {
                    error: regErr?.message ?? "Registration failed",
                    ok: false,
                };
            }

            await withTimeout(
                client.connect(),
                REGISTER_STEP_TIMEOUT_MS,
                "Signup stalled while opening realtime connection.",
            );
            debugAuth("register:connect:ok", undefined);
            $userWritable.set(client.me.user());
            this.setAuthStatus("authenticated");

            await this.saveCredentials(keyStore, {
                deviceID: client.me.device().deviceID,
                deviceKey: privateKey,
                token: "",
                username: client.me.user().username,
            });

            await withTimeout(
                this.populateState(),
                REGISTER_STEP_TIMEOUT_MS,
                "Signup stalled while loading initial account data.",
            );
            debugAuth("register:populateState:ok", undefined);
            return { ok: true };
        } catch (err: unknown) {
            debugAuth("register:catch", {
                error: err instanceof Error ? err.message : String(err),
            });
            if (isUnauthorizedError(err)) {
                this.setAuthStatus("unauthorized");
            } else if (isNetworkError(err)) {
                this.setAuthStatus("offline");
            }
            return { error: errorMessage(err), ok: false };
        }
    }

    async rejectDeviceRequest(requestID: string): Promise<OperationResult> {
        try {
            const client =
                this.requireClient() as unknown as ClientWithDeviceApprovals;
            if (!client.devices.rejectRequest) {
                return {
                    error: "Client does not support device approvals yet.",
                    ok: false,
                };
            }
            await client.devices.rejectRequest(requestID);
            return { ok: true };
        } catch (err: unknown) {
            return { error: errorMessage(err), ok: false };
        }
    }

    async removeDevice(deviceID: string): Promise<OperationResult> {
        try {
            const client = this.requireClient();
            await client.devices.delete(deviceID);
            await this.listMyDevices();
            return { ok: true };
        } catch (err: unknown) {
            return { error: errorMessage(err), ok: false };
        }
    }

    resetAllUnread(): void {
        $dmUnreadCountsWritable.set({});
        $channelUnreadCountsWritable.set({});
    }

    async runBackgroundNetworkFetch(): Promise<BackgroundNetworkFetchResult> {
        const client = this.client;
        if (!client) {
            return "no_data";
        }
        try {
            const status = await this.probeAuthSession();
            if (status !== "authenticated") {
                return status === "offline" ? "no_data" : "failed";
            }
            if (hasSyncInboxNow(client)) {
                await client.syncInboxNow();
            } else {
                await this.populateState();
            }
            return "new_data";
        } catch {
            return "failed";
        }
    }

    async sendDM(
        recipientID: string,
        content: string,
    ): Promise<OperationResult> {
        const send = async (): Promise<void> => {
            const client = this.requireClient();
            await client.messages.send(recipientID, content);
        };
        try {
            await send();
            return { ok: true };
        } catch (err: unknown) {
            if (isNetworkError(err) || isNotAuthenticatedError(err)) {
                const recovered = await this.recoverConnection("send-dm");
                if (recovered === "authenticated") {
                    try {
                        await send();
                        return { ok: true };
                    } catch (retryErr: unknown) {
                        if (
                            isUnauthorizedError(retryErr) ||
                            isNotAuthenticatedError(retryErr)
                        ) {
                            this.setAuthStatus("unauthorized");
                        } else if (isNetworkError(retryErr)) {
                            this.setAuthStatus("offline");
                        }
                        return { error: errorMessage(retryErr), ok: false };
                    }
                }
            }
            return { error: errorMessage(err), ok: false };
        }
    }

    // ── Unread management ───────────────────────────────────────────────

    async sendGroupMessage(
        channelID: string,
        content: string,
    ): Promise<OperationResult> {
        const send = async (): Promise<void> => {
            const client = this.requireClient();
            await client.messages.group(channelID, content);
        };
        try {
            await send();
            return { ok: true };
        } catch (err: unknown) {
            if (isNetworkError(err) || isNotAuthenticatedError(err)) {
                const recovered = await this.recoverConnection("send-group");
                if (recovered === "authenticated") {
                    try {
                        await send();
                        return { ok: true };
                    } catch (retryErr: unknown) {
                        if (
                            isUnauthorizedError(retryErr) ||
                            isNotAuthenticatedError(retryErr)
                        ) {
                            this.setAuthStatus("unauthorized");
                        } else if (isNetworkError(retryErr)) {
                            this.setAuthStatus("offline");
                        }
                        return { error: errorMessage(retryErr), ok: false };
                    }
                }
            }
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

    // ── Lifecycle ───────────────────────────────────────────────────────

    setWebsocketDebug(enabled: boolean): void {
        this.wsDebugEnabled = enabled;
        if (enabled) {
            this.attachWebsocketDebug();
            return;
        }
        this.detachWebsocketDebug();
    }

    setWebsocketFrameDebug(enabled: boolean): void {
        this.wsDebugFrameLogsEnabled = enabled;
        if (!this.wsDebugEnabled) {
            return;
        }
        this.detachWebsocketDebug();
        this.attachWebsocketDebug();
    }

    setWebsocketStateDebug(enabled: boolean): void {
        this.wsDebugStateLogsEnabled = enabled;
    }

    private attachWebsocketDebug(): void {
        if (!this.wsDebugEnabled || !this.client) {
            return;
        }
        const socket = getClientSocket(this.client);
        if (!socket) {
            return;
        }
        if (this.wsDebugSocket === socket && this.wsDebugInboundListener) {
            return;
        }
        this.detachWebsocketDebug();
        if (!this.wsDebugFrameLogsEnabled) {
            this.wsDebugSocket = socket;
            this.logWsState("ws:debug:attached", { frames: false });
            return;
        }
        const inbound = (data: Uint8Array) => {
            debugAuth("ws:in", describeWsFrame(data));
        };
        const originalSend = socket.send.bind(socket);
        socket.send = (data: Uint8Array) => {
            debugAuth("ws:out", describeWsFrame(data));
            originalSend(data);
        };
        socket.on("message", inbound);
        this.wsDebugSocket = socket;
        this.wsDebugInboundListener = inbound;
        this.wsDebugOriginalSend = originalSend;
        this.logWsState("ws:debug:attached", { frames: true });
    }

    // ── Private ─────────────────────────────────────────────────────────

    private async clearStoredCredentials(
        keyStore: KeyStore,
        username: string,
    ): Promise<void> {
        try {
            await keyStore.clear(username);
        } catch {
            /* ignore — best-effort cleanup */
        }
    }

    private configureHttpForRuntime(client: Client): void {
        if (!isReactNativeRuntime()) {
            return;
        }
        const internals = client as unknown as ClientWithInternalHttp;
        const defaults = internals.http?.defaults;
        const http = internals.http;
        if (!defaults || !http) {
            return;
        }
        // In some RN environments axios + default AbortSignal can stall
        // requests before dispatch. Keep abort semantics in SDK runtimes
        // that support it reliably, but clear it on mobile app runtime.
        defaults.signal = undefined;
        if (typeof defaults.timeout !== "number" || defaults.timeout <= 0) {
            defaults.timeout = 15000;
        }
        http.interceptors?.request?.use?.(
            (
                config: ClientHttpRequestConfigLike,
            ): ClientHttpRequestConfigLike => {
                config.signal = undefined;
                if (typeof config.timeout !== "number" || config.timeout <= 0) {
                    config.timeout = 15000;
                }
                return config;
            },
        );
        this.wrapHttpMethodsWithTimeout(http);
    }

    private async createClientWithRecovery(
        privateKey: string,
        clientOptions: ClientOptions,
        storage: Storage,
        allowStorageReset: boolean,
        username: string,
    ): Promise<Client> {
        try {
            return await Client.create(privateKey, clientOptions, storage);
        } catch (err: unknown) {
            if (allowStorageReset && isDecryptMismatchError(err)) {
                debugAuth("initClient:recover:purgeKeyData", { username });
                await storage.purgeKeyData();
                return Client.create(privateKey, clientOptions, storage);
            }
            throw err;
        }
    }

    private detachWebsocketDebug(): void {
        if (!this.wsDebugSocket) {
            return;
        }
        if (this.wsDebugInboundListener) {
            this.wsDebugSocket.off("message", this.wsDebugInboundListener);
        }
        if (this.wsDebugOriginalSend) {
            this.wsDebugSocket.send = this.wsDebugOriginalSend;
        }
        this.wsDebugInboundListener = null;
        this.wsDebugOriginalSend = null;
        this.wsDebugSocket = null;
        this.logWsState("ws:debug:detached");
    }

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

    private async findPendingRequestAfterRegisterFailure(
        client: Client,
        username: string,
        deviceName: string,
    ): Promise<null | string> {
        try {
            const withApprovals =
                client as unknown as ClientWithDeviceApprovals;
            let requests: DeviceApprovalRequest[] | null = null;
            if (withApprovals.devices.listRequests) {
                requests = await withApprovals.devices.listRequests();
            }
            if (!requests || requests.length === 0) {
                return null;
            }
            const pending = requests.filter((req) => req.status === "pending");
            if (pending.length === 0) {
                return null;
            }
            const ownSignKey = client.getKeys().public;
            const bySignKey = pending.find((req) => req.signKey === ownSignKey);
            if (bySignKey) {
                return bySignKey.requestID;
            }
            const byExactMeta = pending.find(
                (req) =>
                    req.username === username && req.deviceName === deviceName,
            );
            if (byExactMeta) {
                return byExactMeta.requestID;
            }
            const recent = pending
                .filter((req) => req.username === username)
                .sort(
                    (a, b) =>
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime(),
                );
            return recent[0]?.requestID ?? null;
        } catch {
            return null;
        }
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
        username: string,
        config: BootstrapConfig,
        options: ServerOptions,
        allowStorageReset = false,
    ): Promise<void> {
        debugAuth("initClient:start", { host: options.host, username });
        await this.close();
        this.resetAll();

        const storage = await config.createStorage(privateKey, username);
        debugAuth("initClient:storage:ok", { username });

        const clientOptions: ClientOptions = {
            ...options,
            deviceName: config.deviceName,
        };

        this.client = await this.createClientWithRecovery(
            privateKey,
            clientOptions,
            storage,
            allowStorageReset,
            username,
        );
        debugAuth("initClient:client:create:ok", { host: options.host });
        this.configureHttpForRuntime(this.client);
        this.attachWebsocketDebug();
        this.wireEvents();
    }

    private isDeviceExistsError(err: unknown): boolean {
        return hasHttpStatus(err) && err.response.status === 470;
    }

    private async loginWithDeviceKeyWithRetry(
        client: Client,
        deviceID?: string,
    ): Promise<Error | null> {
        let lastErr: Error | null = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
            const err = await client.loginWithDeviceKey(deviceID);
            if (!err) {
                return null;
            }
            lastErr = err;
            if (isRateLimitedError(err)) {
                this.markRateLimited("loginWithDeviceKey");
            }
            if (!isRateLimitedError(err) || attempt === 2) {
                return err;
            }
            const backoffMs = 500 * 2 ** attempt;
            await waitMs(backoffMs);
        }
        return lastErr;
    }

    private logWsState(step: string, meta?: Record<string, unknown>): void {
        if (!this.wsDebugEnabled || !this.wsDebugStateLogsEnabled) {
            return;
        }
        debugAuth(step, meta);
    }

    private markRateLimited(source: string): void {
        this.pendingRateLimitNotice = true;
        debugAuth("rate-limited", { source });
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

            const withList = client as unknown as ClientWithUserDeviceListLike;
            if (typeof withList.getUserDeviceList === "function") {
                const devices =
                    (await withList.getUserDeviceList(
                        client.me.user().userID,
                    )) ?? [];
                $devicesWritable.setKey(client.me.user().userID, devices);
            }

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

    private async recoverConnection(
        reason: string,
    ): Promise<null | ResumeNetworkStatus> {
        if (!this.client) {
            return null;
        }
        if (this.connectionRecoveryInFlight) {
            return null;
        }
        const now = Date.now();
        if (now - this.lastConnectionRecoveryAt < 5000) {
            return null;
        }
        this.connectionRecoveryInFlight = true;
        this.lastConnectionRecoveryAt = now;
        debugAuth("connection:recover:start", { reason });
        try {
            const status = await this.refreshSessionAfterForeground();
            debugAuth("connection:recover:done", { reason, status });
            if (status === "unauthorized") {
                $userWritable.set(null);
            }
            return status;
        } catch (err: unknown) {
            debugAuth("connection:recover:error", {
                error: err instanceof Error ? err.message : String(err),
                reason,
            });
            return null;
        } finally {
            this.connectionRecoveryInFlight = false;
        }
    }

    private requireClient(): Client {
        if (!this.client) throw new Error("Not authenticated");
        return this.client;
    }

    private resetAll(): void {
        this.stopPendingApprovalWatcher();
        this.detachWebsocketDebug();
        this.client = null;
        this.failedUserLookups.clear();
        $authStatusWritable.set("signed_out");
        $userWritable.set(null);
        $keyReplacedWritable.set(false);
        this.lastDeviceAuthRefreshAttemptAt = 0;
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

    private setAuthStatus(
        status:
            | "authenticated"
            | "checking"
            | "offline"
            | "signed_out"
            | "unauthorized",
    ): void {
        if ($authStatusWritable.get() !== status) {
            $authStatusWritable.set(status);
        }
    }

    private startPendingApprovalWatcher({
        deviceKey,
        keyStore,
        requestID,
        username,
    }: {
        deviceKey: string;
        keyStore: KeyStore;
        requestID: string;
        username: string;
    }): void {
        this.stopPendingApprovalWatcher();
        let cancelled = false;
        this.pendingApprovalWatchCancel = () => {
            cancelled = true;
        };
        const run = async () => {
            for (let attempt = 0; attempt < 300; attempt++) {
                if (cancelled) return;
                await waitMs(2000);
                if (cancelled) return;
                const client = this.client;
                if (!client) return;
                const withApprovals =
                    client as unknown as ClientWithDeviceApprovals;
                let pending: DeviceApprovalRequest | null = null;
                try {
                    if (
                        typeof withApprovals.devices.getRequest === "function"
                    ) {
                        pending =
                            await withApprovals.devices.getRequest(requestID);
                    } else if (
                        typeof withApprovals.devices.listRequests === "function"
                    ) {
                        const requests =
                            await withApprovals.devices.listRequests();
                        pending =
                            requests.find(
                                (req) => req.requestID === requestID,
                            ) ?? null;
                    }
                } catch {
                    continue;
                }
                if (!pending || pending.status === "pending") {
                    continue;
                }
                if (pending.status === "approved" && pending.approvedDeviceID) {
                    try {
                        await this.saveCredentials(keyStore, {
                            deviceID: pending.approvedDeviceID,
                            deviceKey,
                            token: "",
                            username,
                        });
                        const authErr = await this.loginWithDeviceKeyWithRetry(
                            client,
                            pending.approvedDeviceID,
                        );
                        if (authErr) {
                            return;
                        }
                        await client.connect();
                        $userWritable.set(client.me.user());
                        this.setAuthStatus("authenticated");
                        await this.populateState();
                    } finally {
                        this.stopPendingApprovalWatcher();
                    }
                    return;
                }
                this.stopPendingApprovalWatcher();
                return;
            }
            this.stopPendingApprovalWatcher();
        };
        void run();
    }

    private stopPendingApprovalWatcher(): void {
        if (this.pendingApprovalWatchCancel) {
            this.pendingApprovalWatchCancel();
            this.pendingApprovalWatchCancel = null;
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

    private subscribeToDeviceRequestQueueChanges(): void {
        const client = this.requireClient() as unknown as {
            off: (event: string, fn: () => void) => void;
            on: (event: string, fn: () => void) => void;
        };
        const onQueueChanged = () => {
            for (const listener of this.deviceRequestQueueListeners) {
                try {
                    listener();
                } catch {
                    // ignore listener errors
                }
            }
        };
        client.on("deviceRequest", onQueueChanged);
        this.disposable.add(() => {
            client.off("deviceRequest", onQueueChanged);
        });
    }

    private unwireEvents(): void {
        this.disposable.dispose();
    }

    private wireEvents(): void {
        this.subscribe("connected", () => {
            this.logWsState("ws:connected");
            this.setAuthStatus("authenticated");
            this.attachWebsocketDebug();
        });
        this.subscribe("disconnect", () => {
            this.logWsState("ws:disconnect");
            this.setAuthStatus("offline");
            void this.recoverConnection("disconnect");
        });
        this.subscribe("message", (msg) => {
            if (msg.group) {
                this.handleGroupMessage(msg, msg.group);
            } else {
                this.handleDirectMessage(msg);
            }
        });
        this.subscribeToDeviceRequestQueueChanges();
    }

    private wrapHttpMethodsWithTimeout(http: ClientHttpLike): void {
        const wrapMethod = (
            method: (...args: unknown[]) => Promise<unknown>,
            label: string,
        ): ((...args: unknown[]) => Promise<unknown>) => {
            return async (...args: unknown[]): Promise<unknown> => {
                return withTimeout(
                    method(...args),
                    15000,
                    `HTTP ${label} timed out before dispatch/response.`,
                );
            };
        };
        if (typeof http.get === "function") {
            const original = http.get.bind(http);
            http.get = wrapMethod(original, "GET");
        }
        if (typeof http.post === "function") {
            const original = http.post.bind(http);
            http.post = wrapMethod(original, "POST");
        }
    }
}

function debugAuth(step: string, meta?: Record<string, unknown>): void {
    if (!shouldDebugAuth()) {
        return;
    }
    try {
        const payload = meta ? ` ${JSON.stringify(meta)}` : "";

        console.log(`[vex-auth] ${step}${payload}`);
    } catch {
        console.log(`[vex-auth] ${step}`);
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

function describeWsFrame(data: Uint8Array): {
    bytes: number;
    hex: string;
    text: string;
} {
    const maxHexBytes = 32;
    const maxTextChars = 120;
    const shown = data.subarray(0, maxHexBytes);
    const hex = Array.from(shown)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");
    const suffix = data.length > maxHexBytes ? " ..." : "";
    let text = "";
    try {
        text = new TextDecoder().decode(data).slice(0, maxTextChars);
    } catch {
        text = "<binary>";
    }
    return {
        bytes: data.length,
        hex: `${hex}${suffix}`,
        text,
    };
}

// ── VexService ──────────────────────────────────────────────────────────────

function errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}

function getClientSocket(client: Client): null | WebSocketDebugLike {
    const container = client as unknown as ClientWithSocketLike;
    const maybeSocket = container.socket;
    if (!isWebSocketDebugLike(maybeSocket)) {
        return null;
    }
    return maybeSocket;
}

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

function hasSyncInboxNow(client: Client): client is Client & {
    syncInboxNow: () => Promise<void>;
} {
    const maybeClient = client as unknown as ClientWithSyncInboxLike;
    return typeof maybeClient.syncInboxNow === "function";
}

function isDecryptMismatchError(err: unknown): boolean {
    if (!(err instanceof Error)) {
        return false;
    }
    const msg = err.message.toLowerCase();
    return (
        msg.includes("failed to decrypt sealed column value") ||
        msg.includes("couldn't decrypt messages on disk")
    );
}

function isNetworkError(err: unknown): boolean {
    if (!(err instanceof Error)) {
        return false;
    }
    return /network error/i.test(err.message);
}

function isNotAuthenticatedError(err: unknown): boolean {
    if (!(err instanceof Error)) {
        return false;
    }
    return /not authenticated|no token|login first/i.test(err.message);
}

function isRateLimitedError(err: unknown): boolean {
    if (hasHttpStatus(err)) {
        return err.response.status === 429;
    }
    if (err instanceof Error) {
        return /status code 429|too many requests/i.test(err.message);
    }
    return false;
}

function isReactNativeRuntime(): boolean {
    if (typeof navigator !== "object" || navigator === null) {
        return false;
    }
    return (
        "product" in navigator &&
        (navigator as { product?: string }).product === "ReactNative"
    );
}

function isUnauthorizedError(err: unknown): boolean {
    if (hasHttpStatus(err)) {
        return err.response.status === 401;
    }
    if (err instanceof Error) {
        return /status code 401/i.test(err.message);
    }
    return false;
}

function isWebSocketDebugLike(value: unknown): value is WebSocketDebugLike {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const candidate = value as {
        off?: unknown;
        on?: unknown;
        send?: unknown;
    };
    return (
        typeof candidate.on === "function" &&
        typeof candidate.off === "function" &&
        typeof candidate.send === "function"
    );
}

function jwtExpToEpochMs(exp: number): number {
    // JWT exp is conventionally seconds since epoch; tolerate ms values too.
    return exp > 1_000_000_000_000 ? exp : exp * 1000;
}

function shouldDebugAuth(): boolean {
    const g = globalThis as { __DEV__?: unknown };
    if (g.__DEV__ === true) {
        return true;
    }
    const p = globalThis as {
        process?: { env?: Record<string, string | undefined> };
    };
    return p.process?.env?.["VEX_DEBUG_AUTH"] === "1";
}

function waitMs(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string,
): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<T>((_resolve, reject) => {
                timer = setTimeout(() => {
                    reject(new Error(timeoutMessage));
                }, timeoutMs);
            }),
        ]);
    } finally {
        if (timer) {
            clearTimeout(timer);
        }
    }
}

export const vexService = new VexService();

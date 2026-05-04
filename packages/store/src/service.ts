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
    Passkey,
    Permission,
    Server,
    Storage,
    User,
} from "@vex-chat/libvex";
import type {
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON,
} from "@vex-chat/types";

import { clampLocalMessageRetentionDays, Client } from "@vex-chat/libvex";

import { validate as uuidValidate } from "uuid";

import {
    $authStatusWritable,
    $avatarHashWritable,
    $avatarVersionsWritable,
    $devicesWritable,
    $familiarsWritable,
    $keyReplacedWritable,
    $pendingApprovalStageWritable,
    $signedOutIntentWritable,
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
import {
    $localMessageRetentionDaysWritable,
    setLocalMessageRetentionDaysPreference,
} from "./domains/settings.ts";

// ── Public types ────────────────────────────────────────────────────────────

export type AuthProbeStatus = "authenticated" | "offline" | "unauthorized";
/** Result from any auth flow. */
export interface AuthResult {
    error?: string;
    keyReplaced?: boolean;
    ok: boolean;
    pendingDeviceApproval?: boolean;
    pendingRequestID?: string;
    /**
     * The new device's own public signing key (hex). Provided so the
     * AuthenticateScreen can render the same matching code on both the
     * new and the approving device — both derive it from these bytes
     * (the new device from `client.getKeys().public`, the approver from
     * the request payload's `signKey`).
     */
    pendingSignKey?: string;
    /**
     * Existing user's ID when registration hit a "username already
     * taken" branch. Lets the UI fetch the public avatar from the
     * unauthenticated `/avatar/:userID` endpoint to power an
     * "is this you?" confirmation. Optional because older servers
     * don't include it in the pending response.
     */
    pendingUserID?: string;
    /**
     * Set when the server reported that our stored credentials no longer
     * authenticate (401 from `/auth/device*` for an expired session, or
     * 404 when the device record / its owning user has been deleted
     * server-side). The auth flow has already cleared the offending
     * keychain entry and reset auth state; the caller's job is just to
     * route the user back into the sign-in flow rather than surface a
     * retry-able error. App.tsx uses this to drive the "Session expired"
     * toast; HangTightScreen uses it to skip its own error phase and go
     * straight to the account picker / handle form.
     */
    requireReauth?: boolean;
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

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Result of {@link VexService.beginPasskeySignIn}. Hands back the
 * options the host needs to drive the platform WebAuthn ceremony,
 * plus the `requestID` that ties the assertion in
 * {@link VexService.finishPasskeySignIn} back to the same begin call.
 */
export interface PasskeySignInBegin {
    options: PublicKeyCredentialRequestOptionsJSON;
    requestID: string;
}

export type ResumeNetworkStatus = "signed_out" | AuthProbeStatus;

/** Server connection options — identical across all auth flows. */
export interface ServerOptions {
    host: string;
    inMemoryDb?: boolean;
    /**
     * Local message retention in days (1–30). Values above 30 are clamped
     * by the protocol client to match server-side mail TTL.
     */
    localMessageRetentionDays?: number;
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
    abortPendingRegistration?: (args: {
        challenge: string;
        requestID: string;
    }) => Promise<unknown>;
    approveRequest?: (requestID: string) => Promise<unknown>;
    delete: (deviceID: string) => Promise<void>;
    getRequest?: (requestID: string) => Promise<DeviceApprovalRequest | null>;
    listRequests?: () => Promise<DeviceApprovalRequest[]>;
    pollPendingRegistration?: (args: {
        challenge: string;
        requestID: string;
    }) => Promise<DeviceApprovalRequest | null>;
    publishPendingRegistration?: (args: {
        challenge: string;
        requestID: string;
    }) => Promise<unknown>;
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
// WebSocket watchdog: spire pings every 5s, libvex's own keep-alive
// fires after ~30s of silence (post-fix in 6.1.7+). 45s gives that
// path a chance to run first; the watchdog only triggers if libvex's
// detector didn't (older SDK, or some edge case where it didn't).
const WS_WATCHDOG_CHECK_INTERVAL_MS = 30_000;
const WS_WATCHDOG_STALE_THRESHOLD_MS = 45_000;
// Tighter threshold for "is the socket *currently* delivering frames?"
// used by `refreshSessionAfterForeground` to decide whether the
// foreground-service kept the connection healthy across the resume.
// Server pings land every 5s, so a frame within the last 12s is a
// strong signal we don't need to tear the socket down. Anything older
// is treated as stale → full reconnect.
const WS_FRESH_FRAME_THRESHOLD_MS = 12_000;

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
    private autoLoginInFlight: null | Promise<AuthResult> = null;
    private client: Client | null = null;
    private connectionRecoveryInFlight = false;
    /**
     * Populated when `register()` hits "username taken" and the server
     * created a deferred enrollment (no owner push until
     * {@link publishDeferredDeviceApprovalAndStartWatching}).
     */
    private deferredDeviceApproval: null | {
        challenge: string;
        deviceKey: string;
        keyStore: KeyStore;
        requestID: string;
        username: string;
    } = null;
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
    // Watchdog state. Tracks the last time *any* inbound frame
    // (including server pings every 5s) arrived on the underlying
    // WebSocket. If the gap exceeds {@link WS_WATCHDOG_STALE_THRESHOLD_MS}
    // we force a reconnect — backstop for half-open sockets where
    // neither libvex's ping detector nor the OS surfaces a close event
    // (Android emulator NAT timeouts, sleeping mobile radios).
    private wsWatchdogInterval: null | ReturnType<typeof setInterval> = null;
    private wsWatchdogLastFrameAt = 0;
    private wsWatchdogListener: ((data: Uint8Array) => void) | null = null;
    private wsWatchdogSocket: null | WebSocketDebugLike = null;

    // ── Auth flows ──────────────────────────────────────────────────────

    /**
     * Deletes a deferred enrollment on the server before any owner
     * notification (user said the account wasn't theirs).
     */
    async abortDeferredDeviceApproval(): Promise<void> {
        const d = this.deferredDeviceApproval;
        if (!d) {
            return;
        }
        const client = this.client;
        if (!client) {
            this.deferredDeviceApproval = null;
            return;
        }
        const abort = (client as unknown as ClientWithDeviceApprovals).devices
            .abortPendingRegistration;
        if (typeof abort !== "function") {
            this.deferredDeviceApproval = null;
            return;
        }
        try {
            await abort({
                challenge: d.challenge,
                requestID: d.requestID,
            });
        } catch {
            /* row may already be gone */
        }
        this.deferredDeviceApproval = null;
    }

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
        if (this.autoLoginInFlight) {
            return this.autoLoginInFlight;
        }
        // An autoLogin attempt is intentional re-auth; clear the explicit
        // sign-out intent so subsequent flows behave normally.
        $signedOutIntentWritable.set(false);
        const run = async (): Promise<AuthResult> => {
            if (
                this.client &&
                $userWritable.get() !== null &&
                $authStatusWritable.get() === "authenticated"
            ) {
                debugAuth("autoLogin:skip:already-authenticated", {
                    host: options.host,
                });
                return { ok: true };
            }
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
                    if (isStaleCredentialError(authErr)) {
                        debugAuth(
                            "autoLogin:stale-credentials:clearingCredentials",
                            {
                                status: hasHttpStatus(authErr)
                                    ? authErr.response.status
                                    : null,
                                username: creds.username,
                            },
                        );
                        await this.clearStoredCredentials(
                            keyStore,
                            creds.username,
                        );
                        this.setAuthStatus("unauthorized");
                        return {
                            error: "Session expired. Please sign in again.",
                            ok: false,
                            requireReauth: true,
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
                            if (isStaleCredentialError(authErr)) {
                                debugAuth(
                                    "autoLogin:decrypt-mismatch:recover:stale-credentials:clearingCredentials",
                                    {
                                        status: hasHttpStatus(authErr)
                                            ? authErr.response.status
                                            : null,
                                        username: creds.username,
                                    },
                                );
                                await this.clearStoredCredentials(
                                    keyStore,
                                    creds.username,
                                );
                                this.setAuthStatus("unauthorized");
                                return {
                                    error: "Session expired. Please sign in again.",
                                    ok: false,
                                    requireReauth: true,
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
                if (isStaleCredentialError(err)) {
                    debugAuth(
                        "autoLogin:catch:stale-credentials:clearingCredentials",
                        {
                            status: hasHttpStatus(err)
                                ? err.response.status
                                : null,
                            username: creds.username,
                        },
                    );
                    await this.clearStoredCredentials(keyStore, creds.username);
                    this.setAuthStatus("unauthorized");
                    return {
                        error: "Session expired. Please sign in again.",
                        ok: false,
                        requireReauth: true,
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
        };
        this.autoLoginInFlight = run();
        try {
            return await this.autoLoginInFlight;
        } finally {
            this.autoLoginInFlight = null;
        }
    }

    /**
     * Begin a passkey-registration ceremony for the currently
     * signed-in user. Returns the WebAuthn options the host should
     * pass to the platform ceremony. Pair with
     * {@link finishPasskeyRegistration} once the user has approved
     * on their authenticator.
     */
    async beginPasskeyRegistration(name: string): Promise<{
        options: PublicKeyCredentialCreationOptionsJSON;
        requestID: string;
    }> {
        const client = this.requireClient();
        const begin = await client.passkeys.beginRegistration(name);
        return {
            options: begin.options as PublicKeyCredentialCreationOptionsJSON,
            requestID: begin.requestID,
        };
    }

    /**
     * Begin a passkey authentication ceremony. Stage one of the
     * recovery flow: the host drives the platform WebAuthn ceremony
     * with the returned options, then hands the assertion back via
     * {@link finishPasskeySignIn}.
     *
     * Boots a fresh, unauthenticated client against the supplied
     * server (no device login, no storage). The username doesn't
     * have to match anything on this device — the user is asserting
     * "I'm @username, here's a passkey that proves it".
     */
    async beginPasskeySignIn(
        username: string,
        config: BootstrapConfig,
        options: ServerOptions,
    ): Promise<PasskeySignInBegin> {
        const trimmed = username.trim();
        if (trimmed.length === 0) {
            throw new Error("Enter the username for your account.");
        }
        // Fresh client with a throwaway key — we never call
        // loginWithDeviceKey on it. The HTTP transport is what we
        // need; the device key just gives the constructor something
        // to seal storage with.
        const privateKey = Client.generateSecretKey();
        await this.initClient(privateKey, trimmed, config, options, true);
        const client = this.requireClient();
        const begin = await client.passkeys.beginAuthentication(trimmed);
        return {
            options: begin.options as PublicKeyCredentialRequestOptionsJSON,
            requestID: begin.requestID,
        };
    }

    /**
     * Zero-input bootstrap flow used on app startup:
     * 1) attempt device-key auto-login from local credentials
     * 2) if no credentials exist, auto-provision a fresh key cluster/device
     */
    async bootstrapAuth(
        keyStore: KeyStore,
        config: BootstrapConfig,
        options: ServerOptions,
    ): Promise<AuthResult> {
        const existing = await this.autoLogin(keyStore, config, options);
        if (existing.ok) {
            return existing;
        }
        // Only auto-provision when there is no local credential material.
        if (existing.error) {
            return existing;
        }

        const autoUsername = generateAutoProvisionUsername();
        return this.register(autoUsername, "", config, options, keyStore);
    }

    /**
     * Cancels a pending device-approval handshake that was started by
     * `register()` after discovering the username was already taken.
     *
     * This is called when the user, on the "Is this you?" confirmation
     * screen, picks "no — different name". We stop polling the server
     * locally and reset the approval stage to "idle" so the auth UI
     * doesn't show stale "waiting for approval" state.
     *
     * Note: the request itself still exists server-side until its TTL
     * expires (a few minutes). We can't reject it from here because the
     * new (unauthenticated) device doesn't own a token capable of
     * touching the protected `/users/:id/devices/...` reject route. The
     * existing device's owner will see the notification and can simply
     * deny it themselves.
     */
    cancelPendingApproval(): void {
        this.stopPendingApprovalWatcher();
        $pendingApprovalStageWritable.set("idle");
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

    /**
     * Remove a passkey from the currently signed-in account. Works
     * with either a device session OR a passkey session — spire's
     * delete route accepts both, and the UI surfaces this from both
     * Settings and the recovery screen.
     */
    async deletePasskey(passkeyID: string): Promise<OperationResult> {
        try {
            const client = this.requireClient();
            await client.passkeys.delete(passkeyID);
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

    /**
     * Finish a passkey-registration ceremony. Persists the new
     * authenticator on spire and returns the public passkey shape
     * for the Settings list.
     */
    async finishPasskeyRegistration(args: {
        name: string;
        requestID: string;
        response: Record<string, unknown>;
    }): Promise<{ error?: string; ok: boolean; passkey?: Passkey }> {
        try {
            const client = this.requireClient();
            const passkey = await client.passkeys.finishRegistration(args);
            return { ok: true, passkey };
        } catch (err: unknown) {
            return { error: errorMessage(err), ok: false };
        }
    }

    // ── Channel operations ──────────────────────────────────────────────

    /**
     * Finish a passkey authentication ceremony. Stage two of the
     * recovery flow. On success the libvex Client is in
     * "passkey-only" mode — it can call the `passkeys.*` admin
     * routes (list/delete devices, approve/reject pending
     * enrollment) but messaging is unavailable until a device key
     * takes over. The caller is expected to drive the user through
     * the recovery screen and either:
     *   - approve a pending enrollment for a fresh device, then
     *     swap to a normal device session via `login()`/`autoLogin()`
     *   - or just clean up old devices and sign back out.
     */
    async finishPasskeySignIn(args: {
        requestID: string;
        response: Record<string, unknown>;
    }): Promise<{
        error?: string;
        ok: boolean;
        userID?: string;
        username?: string;
    }> {
        try {
            const client = this.requireClient();
            const result = await client.passkeys.finishAuthentication(args);
            // We deliberately don't flip $userWritable / authStatus
            // to "authenticated" here — the user is *not* in a full
            // messaging session, just a short-lived recovery one.
            // The recovery screen reads `getPasskeyUser()` to know
            // who's authenticated.
            return {
                ok: true,
                userID: result.user.userID,
                username: result.user.username,
            };
        } catch (err: unknown) {
            return { error: errorMessage(err), ok: false };
        }
    }

    async getChannelMembers(channelID: string): Promise<User[]> {
        const client = this.requireClient();
        return client.channels.userList(channelID);
    }

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

    /** Effective local retention cap (defaults to 30 when signed out). */
    getLocalMessageRetentionDays(): number {
        if (this.client) {
            return this.client.getLocalMessageRetentionDays();
        }
        return $localMessageRetentionDaysWritable.get();
    }

    // ── Messaging ───────────────────────────────────────────────────────

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

    /**
     * List all passkeys belonging to the current account. Works in
     * either a device session or a passkey-recovery session.
     */
    async listPasskeys(): Promise<Passkey[]> {
        const client = this.requireClient();
        return client.passkeys.list();
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
        $signedOutIntentWritable.set(false);
        this.setAuthStatus("checking");
        debugAuth("login:start", { host: options.host, username });
        try {
            const identifier = username.trim();
            const creds =
                identifier.length > 0
                    ? await keyStore.load(identifier)
                    : await keyStore.load();
            const privateKey = creds?.deviceKey ?? Client.generateSecretKey();

            await this.initClient(
                privateKey,
                identifier.length > 0 ? identifier : (creds?.username ?? ""),
                config,
                options,
                !creds,
            );
            debugAuth("login:initClient:ok", {
                host: options.host,
                username: identifier.length > 0 ? identifier : creds?.username,
            });
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
                if (isStaleCredentialError(authErr)) {
                    debugAuth("login:stale-credentials:clearingCredentials", {
                        status: hasHttpStatus(authErr)
                            ? authErr.response.status
                            : null,
                        username: creds.username,
                    });
                    await this.clearStoredCredentials(keyStore, creds.username);
                    this.setAuthStatus("unauthorized");
                    return {
                        error: "Session expired. Please sign in again.",
                        ok: false,
                        requireReauth: true,
                    };
                }
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
            if (isStaleCredentialError(err)) {
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
        // Mark sign-out as explicit so the auth UI does not auto-login from
        // the keychain credentials we intentionally keep around.
        $signedOutIntentWritable.set(true);
    }

    async lookupUser(query: string): Promise<null | User> {
        try {
            const client = this.requireClient();
            // Lowercase non-UUID lookups so cache keys / negative-
            // cache hits inside libvex are consistent regardless of
            // how the caller typed the handle. UUID identifiers are
            // pass-through; libvex's `fetchUser` makes the same
            // distinction internally.
            const trimmed = query.trim();
            const normalizedQuery = uuidValidate(trimmed)
                ? trimmed
                : trimmed.toLowerCase();
            const [user] = await client.users.retrieve(normalizedQuery);
            return user;
        } catch {
            return null;
        }
    }

    markRead(conversationKey: string): void {
        $dmUnreadCountsWritable.setKey(conversationKey, 0);
        $channelUnreadCountsWritable.setKey(conversationKey, 0);
    }

    // ── User operations ─────────────────────────────────────────────────

    onDeviceRequestQueueChanged(listener: () => void): () => void {
        this.deviceRequestQueueListeners.add(listener);
        return () => {
            this.deviceRequestQueueListeners.delete(listener);
        };
    }

    /**
     * Approve a pending device-enrollment request using the
     * passkey-only session. Mirrors {@link approveDeviceRequest}
     * but bypasses the device-JWT requirement; the caller must have
     * just completed {@link finishPasskeySignIn}.
     */
    async passkeyApproveDeviceRequest(
        requestID: string,
    ): Promise<OperationResult> {
        try {
            const client = this.requireClient();
            await client.passkeys.approveDeviceRequest(requestID);
            return { ok: true };
        } catch (err: unknown) {
            return { error: errorMessage(err), ok: false };
        }
    }

    /** Delete a device using the passkey-only session. */
    async passkeyDeleteDevice(deviceID: string): Promise<OperationResult> {
        try {
            const client = this.requireClient();
            await client.passkeys.deleteDevice(deviceID);
            return { ok: true };
        } catch (err: unknown) {
            return { error: errorMessage(err), ok: false };
        }
    }

    /** List all of the account's devices using the passkey-only session. */
    async passkeyListDevices(): Promise<Device[]> {
        const client = this.requireClient();
        const devices = await client.passkeys.listDevices();
        return [...devices].sort(
            (a, b) =>
                new Date(b.lastLogin).getTime() -
                new Date(a.lastLogin).getTime(),
        );
    }

    /** Reject a pending device-enrollment request using the passkey-only session. */
    async passkeyRejectDeviceRequest(
        requestID: string,
    ): Promise<OperationResult> {
        try {
            const client = this.requireClient();
            await client.passkeys.rejectDeviceRequest(requestID);
            return { ok: true };
        } catch (err: unknown) {
            return { error: errorMessage(err), ok: false };
        }
    }

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
            // 404 here means the user record (or device record, depending on
            // the server build) backing our token has been deleted while we
            // were holding a still-valid JWT. Treat it as unauthorized so the
            // caller's recovery path (refresh → fail → clear creds + bounce
            // to sign-in) fires the same way it does for an expired token.
            if (isStaleCredentialError(err)) {
                this.setAuthStatus("unauthorized");
                return "unauthorized";
            }
            this.setAuthStatus("offline");
            return "offline";
        }
    }

    /**
     * Notifies the account owner's other devices and starts polling for
     * approval. Call after the user confirms "this account is mine" on the
     * gate screen (or immediately from UIs that have no such gate).
     */
    async publishDeferredDeviceApprovalAndStartWatching(
        keyStore: KeyStore,
    ): Promise<{ error?: string; ok: boolean }> {
        const d = this.deferredDeviceApproval;
        if (!d) {
            return {
                error: "No pending device enrollment to confirm.",
                ok: false,
            };
        }
        if (d.keyStore !== keyStore) {
            return { error: "Key store mismatch.", ok: false };
        }
        const client = this.client;
        if (!client) {
            return { error: "Client not ready.", ok: false };
        }
        const withDevices = client as unknown as ClientWithDeviceApprovals;
        const publish = withDevices.devices.publishPendingRegistration;
        if (typeof publish !== "function") {
            return {
                error: "Update the Vex client to confirm this device.",
                ok: false,
            };
        }
        try {
            await publish({
                challenge: d.challenge,
                requestID: d.requestID,
            });
        } catch (err: unknown) {
            return { error: errorMessage(err), ok: false };
        }
        this.startPendingApprovalWatcher({
            challenge: d.challenge,
            deviceKey: d.deviceKey,
            keyStore: d.keyStore,
            requestID: d.requestID,
            username: d.username,
        });
        this.deferredDeviceApproval = null;
        return { ok: true };
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
            // If the foreground-service kept the WebSocket alive through
            // the background → resume window, the watchdog will have a
            // very recent inbound-frame timestamp. Tearing that socket
            // down just to redo the Noise handshake + login is wasted
            // CPU on the JS thread at exactly the moment Android wants
            // the UI thread responsive (unlock animation, activity
            // foreground transition). Skip the reconnect when we have
            // strong evidence the socket is healthy; fall through to a
            // lightweight inbox sync.
            //
            // If the watchdog is stale (FGS got killed by the OS, or
            // we're not in always-on mode), do the full reconnect — the
            // socket can't be trusted.
            if (!this.isWebsocketLikelyHealthy()) {
                await withTimeout(
                    this.client.reconnectWebsocket(),
                    10_000,
                    "WebSocket reconnect timed out after app resume.",
                );
                // reconnectWebsocket() swaps the underlying socket object; re-bind
                // debug hooks so inbound/outbound frame logging continues.
                this.attachWebsocketDebug();
            }
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
            if (isStaleCredentialError(err)) {
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
        $signedOutIntentWritable.set(false);
        $pendingApprovalStageWritable.set("idle");
        this.setAuthStatus("checking");
        debugAuth("register:start", { host: options.host, username });
        try {
            this.deferredDeviceApproval = null;
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
            // Usernames are case-insensitive at the protocol level —
            // the server canonicalizes to lowercase at registration.
            // Pre-normalizing here keeps the local view (UI state,
            // logging, error messages) consistent with what will
            // eventually round-trip back as `me.user().username`.
            const registrationUsername =
                username.trim().length > 0
                    ? username.trim().toLowerCase()
                    : generateAutoProvisionUsername();
            const [user, regErr] = await withTimeout(
                client.register(registrationUsername),
                REGISTER_STEP_TIMEOUT_MS,
                `Signup stalled before reaching server registration at ${options.host}.`,
            );
            debugAuth("register:http:done", {
                hasUser: Boolean(user),
                regErr: regErr?.message ?? null,
            });
            if (regErr || !user) {
                const pending = regErr
                    ? this.extractPendingApprovalDetails(regErr)
                    : null;
                debugAuth("register:pendingDetect", {
                    hasChallenge: pending?.challenge !== null,
                    pendingRequestID: pending?.requestID ?? null,
                    regErrName: regErr?.name ?? null,
                });
                if (pending) {
                    // Server created the enrollment row but (for libvex 6.x+
                    // servers) does not notify other devices until the user
                    // confirms on this screen — see
                    // `publishDeferredDeviceApprovalAndStartWatching`.
                    if (
                        typeof pending.challenge === "string" &&
                        pending.challenge.length > 0
                    ) {
                        this.deferredDeviceApproval = {
                            challenge: pending.challenge,
                            deviceKey: privateKey,
                            keyStore,
                            requestID: pending.requestID,
                            username: registrationUsername,
                        };
                    } else {
                        this.startPendingApprovalWatcher({
                            challenge: pending.challenge,
                            deviceKey: privateKey,
                            keyStore,
                            requestID: pending.requestID,
                            username: registrationUsername,
                        });
                    }
                    let pendingSignKey: string | undefined;
                    try {
                        pendingSignKey = client.getKeys().public;
                    } catch {
                        pendingSignKey = undefined;
                    }
                    return {
                        error: "Device approval requested. Confirm this new device from an existing signed-in device.",
                        ok: false,
                        pendingDeviceApproval: true,
                        pendingRequestID: pending.requestID,
                        ...(pendingSignKey !== undefined
                            ? { pendingSignKey }
                            : {}),
                        ...(pending.userID !== null
                            ? { pendingUserID: pending.userID }
                            : {}),
                    };
                }
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
            this.deferredDeviceApproval = null;
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

    /**
     * Clears the WebSocket watchdog's "last frame" timestamp.
     *
     * Called by the foreground-service module after a revive (when the
     * OS killed the FGS and we re-create it). Without this, the next
     * `refreshSessionAfterForeground` could see a stale-but-recent
     * timestamp from the dead socket and incorrectly skip the
     * reconnect path. Forcing the watchdog into "no observed frames
     * yet" state means {@link isWebsocketLikelyHealthy} returns false
     * until the new socket genuinely receives a frame, which is the
     * conservative correct answer.
     */
    resetWebsocketWatchdog(): void {
        this.wsWatchdogLastFrameAt = 0;
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

    // ── Unread management ───────────────────────────────────────────────

    async setAvatar(data: Uint8Array): Promise<OperationResult> {
        const bumpVersionForCurrentUser = (): void => {
            $avatarHashWritable.set(Date.now());
            const me = $userWritable.get();
            if (me?.userID) {
                $avatarVersionsWritable.setKey(me.userID, Date.now());
            }
        };
        try {
            const client = this.requireClient();
            await client.me.setAvatar(data);
            bumpVersionForCurrentUser();
            return { ok: true };
        } catch (err: unknown) {
            const message = errorMessage(err);
            const looksLikeReactNativeBlobError =
                message.includes("ArrayBuffer") &&
                message.includes("ArrayBufferView") &&
                message.includes("Blob");
            if (looksLikeReactNativeBlobError) {
                // React Native/Hermes can reject Blob(ArrayBufferView) construction.
                // libvex has a built-in JSON/base64 upload fallback that is used
                // when FormData is unavailable, so temporarily disable FormData
                // for this call and retry through that code path.
                const globalWithFormData = globalThis as {
                    FormData?: unknown;
                };
                const originalFormData = globalWithFormData.FormData;
                try {
                    globalWithFormData.FormData = undefined;
                    const client = this.requireClient();
                    await client.me.setAvatar(data);
                    bumpVersionForCurrentUser();
                    return { ok: true };
                } catch (retryErr: unknown) {
                    return { error: errorMessage(retryErr), ok: false };
                } finally {
                    globalWithFormData.FormData = originalFormData;
                }
            }
            return { error: errorMessage(err), ok: false };
        }
    }

    /**
     * Updates the local message retention preference (1–30 days) and
     * applies it to the live client when connected.
     */
    setLocalMessageRetentionDays(days: number): void {
        const clamped = clampLocalMessageRetentionDays(days);
        setLocalMessageRetentionDaysPreference(clamped);
        this.client?.setLocalMessageRetentionDays(clamped);
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

    /**
     * Binds the watchdog's "any inbound frame" listener to the
     * underlying WebSocket and starts the periodic stale check.
     * Idempotent when called against the same socket; on a socket
     * swap (after `reconnectWebsocket`), detaches the old listener
     * and re-binds to the new one.
     */
    private attachWebsocketWatchdog(): void {
        if (!this.client) {
            return;
        }
        const socket = getClientSocket(this.client);
        if (!socket) {
            return;
        }
        if (this.wsWatchdogSocket === socket && this.wsWatchdogListener) {
            return;
        }
        this.detachWebsocketWatchdogListener();
        const listener = (_data: Uint8Array) => {
            this.wsWatchdogLastFrameAt = Date.now();
        };
        socket.on("message", listener);
        this.wsWatchdogSocket = socket;
        this.wsWatchdogListener = listener;
        this.wsWatchdogLastFrameAt = Date.now();
        if (!this.wsWatchdogInterval) {
            this.wsWatchdogInterval = setInterval(() => {
                this.checkWebsocketWatchdog();
            }, WS_WATCHDOG_CHECK_INTERVAL_MS);
        }
    }

    private checkWebsocketWatchdog(): void {
        if (!this.client || this.wsWatchdogLastFrameAt === 0) {
            return;
        }
        const elapsed = Date.now() - this.wsWatchdogLastFrameAt;
        if (elapsed <= WS_WATCHDOG_STALE_THRESHOLD_MS) {
            return;
        }
        this.logWsState("ws:watchdog:stale", { elapsedMs: elapsed });
        // Reset so we don't fire repeatedly while recovery is in
        // flight; the new connection's first inbound frame will
        // refresh the timestamp organically.
        this.wsWatchdogLastFrameAt = Date.now();
        void this.recoverConnection("watchdog-stale");
    }

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

    /**
     * Removes only the inbound-frame listener and clears the socket
     * pointer; leaves the periodic interval running so the next
     * `attachWebsocketWatchdog` call can re-bind without restarting
     * the timer.
     */
    private detachWebsocketWatchdogListener(): void {
        if (this.wsWatchdogSocket && this.wsWatchdogListener) {
            try {
                this.wsWatchdogSocket.off("message", this.wsWatchdogListener);
            } catch {
                // socket may already be in a torn-down state; ignore.
            }
        }
        this.wsWatchdogSocket = null;
        this.wsWatchdogListener = null;
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

    private extractPendingApprovalDetails(err: unknown): null | {
        challenge: null | string;
        requestID: string;
        userID: null | string;
    } {
        // libvex >=6.1.4 throws a typed error carrying both fields;
        // newer libvex/server pairings additionally carry the existing
        // user's ID so we can show their avatar in the "is this you?"
        // confirmation.
        if (
            err !== null &&
            typeof err === "object" &&
            "requestID" in err &&
            typeof (err as { requestID: unknown }).requestID === "string"
        ) {
            const requestID = (err as { requestID: string }).requestID;
            const maybeChallenge = (err as { challenge?: unknown }).challenge;
            const maybeUserID = (err as { userID?: unknown }).userID;
            return {
                challenge:
                    typeof maybeChallenge === "string" ? maybeChallenge : null,
                requestID,
                userID:
                    typeof maybeUserID === "string" && maybeUserID.length > 0
                        ? maybeUserID
                        : null,
            };
        }
        const message =
            err !== null &&
            typeof err === "object" &&
            "message" in err &&
            typeof (err as { message: unknown }).message === "string"
                ? (err as { message: string }).message
                : "";
        const match = /requestID=([0-9a-fA-F-]+)/.exec(message);
        if (match?.[1]) {
            return { challenge: null, requestID: match[1], userID: null };
        }
        return null;
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
            localMessageRetentionDays: clampLocalMessageRetentionDays(
                options.localMessageRetentionDays,
            ),
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

    /**
     * Best-effort "is the WebSocket currently usable?" check, based on
     * how recently the watchdog has seen an inbound frame. A healthy
     * socket sees a server ping every ~5s, so a frame within
     * {@link WS_FRESH_FRAME_THRESHOLD_MS} is strong evidence the
     * connection is live.
     *
     * Returns false in three cases that all *should* trigger a full
     * reconnect:
     *   - No client yet (nothing to check).
     *   - Watchdog has never observed a frame on this socket.
     *   - The last frame is older than the freshness threshold (FGS
     *     got killed, OS suspended us deeper than expected, network
     *     dropped silently).
     *
     * Used by {@link refreshSessionAfterForeground} to skip an
     * unnecessary Noise+login cycle when the foreground-service kept
     * the connection alive across the resume.
     */
    private isWebsocketLikelyHealthy(): boolean {
        if (!this.client || this.wsWatchdogLastFrameAt === 0) {
            return false;
        }
        const elapsed = Date.now() - this.wsWatchdogLastFrameAt;
        return elapsed <= WS_FRESH_FRAME_THRESHOLD_MS;
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
        this.deferredDeviceApproval = null;
        this.detachWebsocketDebug();
        this.stopWebsocketWatchdog();
        this.client = null;
        this.failedUserLookups.clear();
        $authStatusWritable.set("signed_out");
        $userWritable.set(null);
        $keyReplacedWritable.set(false);
        $pendingApprovalStageWritable.set("idle");
        $avatarVersionsWritable.set({});
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
        challenge,
        deviceKey,
        keyStore,
        requestID,
        username,
    }: {
        challenge: null | string;
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
        debugAuth("approvalWatcher:start", {
            hasChallenge: challenge !== null,
            requestID,
            username,
        });
        $pendingApprovalStageWritable.set("waiting");
        const run = async () => {
            for (let attempt = 0; attempt < 300; attempt++) {
                if (cancelled) return;
                await waitMs(2000);
                if (cancelled) return;
                const client = this.client;
                if (!client) {
                    debugAuth("approvalWatcher:noClient", { attempt });
                    return;
                }
                const withApprovals =
                    client as unknown as ClientWithDeviceApprovals;
                const pollPendingRegistration =
                    withApprovals.devices.pollPendingRegistration;
                const usingUnauth =
                    challenge !== null &&
                    typeof pollPendingRegistration === "function";
                let pending: DeviceApprovalRequest | null = null;
                try {
                    // Prefer the unauthenticated poll when we have a challenge
                    // — the new device has no token until approval lands, so
                    // the protected getRequest/listRequests endpoints would
                    // throw "auth event not emitted" forever.
                    if (
                        usingUnauth &&
                        typeof pollPendingRegistration === "function" &&
                        challenge !== null
                    ) {
                        pending = await pollPendingRegistration({
                            challenge,
                            requestID,
                        });
                    } else if (
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
                    debugAuth("approvalWatcher:poll", {
                        attempt,
                        method: usingUnauth
                            ? "pollPendingRegistration"
                            : "getRequest",
                        requestID,
                        status: pending?.status ?? "null",
                    });
                } catch (err: unknown) {
                    debugAuth("approvalWatcher:pollError", {
                        attempt,
                        message: errorMessage(err),
                        method: usingUnauth
                            ? "pollPendingRegistration"
                            : "getRequest",
                    });
                    continue;
                }
                if (!pending || pending.status === "pending") {
                    continue;
                }
                if (pending.status === "approved" && pending.approvedDeviceID) {
                    debugAuth("approvalWatcher:approved", {
                        approvedDeviceID: pending.approvedDeviceID,
                        requestID,
                    });
                    try {
                        $pendingApprovalStageWritable.set("signing_in");
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
                            debugAuth("approvalWatcher:loginFailed", {
                                message: authErr.message,
                            });
                            $pendingApprovalStageWritable.set("idle");
                            return;
                        }
                        $pendingApprovalStageWritable.set("loading_account");
                        await client.connect();
                        $userWritable.set(client.me.user());
                        this.setAuthStatus("authenticated");
                        await this.populateState();
                        debugAuth("approvalWatcher:done", {
                            requestID,
                        });
                    } finally {
                        $pendingApprovalStageWritable.set("idle");
                        this.stopPendingApprovalWatcher();
                    }
                    return;
                }
                debugAuth("approvalWatcher:terminal", {
                    status: pending.status,
                });
                $pendingApprovalStageWritable.set("idle");
                this.stopPendingApprovalWatcher();
                return;
            }
            debugAuth("approvalWatcher:givingUp", { requestID });
            $pendingApprovalStageWritable.set("idle");
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

    private stopWebsocketWatchdog(): void {
        if (this.wsWatchdogInterval) {
            clearInterval(this.wsWatchdogInterval);
            this.wsWatchdogInterval = null;
        }
        this.detachWebsocketWatchdogListener();
        this.wsWatchdogLastFrameAt = 0;
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
        this.stopWebsocketWatchdog();
        this.disposable.dispose();
    }

    private wireEvents(): void {
        this.subscribe("connected", () => {
            this.logWsState("ws:connected");
            this.setAuthStatus("authenticated");
            this.attachWebsocketDebug();
            // The underlying socket object is swapped on every
            // (re)connect, so re-bind the watchdog listener to the
            // fresh instance.
            this.attachWebsocketWatchdog();
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
        // Initial bind for the socket the freshly-connected client
        // already owns (in case `connected` fired before this method
        // ran, or the SDK doesn't re-emit it for the first session).
        this.attachWebsocketWatchdog();
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

/**
 * Extract a human-readable message from an error.
 *
 * For axios HTTP errors, surface the server-sent body instead of
 * the generic "Request failed with status code N". libvex configures
 * its axios instance with `responseType: "arraybuffer"` so the body
 * arrives as raw bytes regardless of `Content-Type`; spire's error
 * envelopes are JSON in practice, in one of two shapes:
 *
 *   1. Flat:    { "error": "<message>" }
 *   2. Wrapped: { "error": { "message": "<message>", "requestId": "..." } }
 *
 * Both come from spire's central error pipeline (`errors.ts`). We
 * try (1) first, fall back to (2), and finally fall back to the raw
 * decoded text or the underlying error's `.message` so that nothing
 * goes silently lost.
 *
 * Without this, server-side validation failures reach the UI as
 * "Request failed with status code 400" with no detail, which makes
 * passkey / device / message errors effectively undebuggable.
 */
function errorMessage(err: unknown): string {
    const fromBody = extractServerErrorBody(err);
    if (fromBody !== null) {
        return fromBody;
    }
    return err instanceof Error ? err.message : String(err);
}

function extractServerErrorBody(err: unknown): null | string {
    if (err == null || typeof err !== "object") return null;
    const errObj = err as { response?: unknown };
    const response = errObj.response;
    if (response == null || typeof response !== "object") return null;
    const data = (response as { data?: unknown }).data;
    if (data == null) return null;

    let bodyText: null | string = null;
    if (data instanceof ArrayBuffer) {
        bodyText = new TextDecoder().decode(data);
    } else if (
        data instanceof Uint8Array ||
        (typeof data === "object" &&
            "byteLength" in data &&
            typeof (data as { byteLength: unknown }).byteLength === "number" &&
            "buffer" in data)
    ) {
        bodyText = new TextDecoder().decode(data as Uint8Array);
    } else if (typeof data === "string") {
        bodyText = data;
    } else if (typeof data === "object") {
        return readErrorField(data) ?? null;
    }

    if (bodyText === null) return null;

    try {
        const parsed: unknown = JSON.parse(bodyText);
        const fromJson = readErrorField(parsed);
        if (fromJson !== null) return fromJson;
    } catch {
        // Body wasn't JSON; fall through and return the raw text if
        // it looks usable.
    }

    const trimmed = bodyText.trim();
    if (trimmed.length > 0 && trimmed.length < 500) {
        return trimmed;
    }
    return null;
}

function generateAutoProvisionUsername(): string {
    const bytes = new Uint8Array(4);
    if (typeof globalThis.crypto?.getRandomValues !== "function") {
        throw new Error("Secure random generator unavailable.");
    }
    globalThis.crypto.getRandomValues(bytes);
    const entropy = Array.from(bytes, (b) =>
        b.toString(16).padStart(2, "0"),
    ).join("");
    return `key_${entropy}`;
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

function isNotFoundError(err: unknown): boolean {
    if (hasHttpStatus(err)) {
        return err.response.status === 404;
    }
    if (err instanceof Error) {
        return /status code 404/i.test(err.message);
    }
    return false;
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

/**
 * "These credentials no longer authenticate."
 *
 * Both 401 and 404 from the device-auth endpoints (`/auth/device`,
 * `/auth/device/verify`, and `whoami`) mean the same thing for the
 * caller: the stored deviceID/deviceKey on this client refers to
 * something the server will no longer let us in with. 401 is the
 * classic "token rejected" path (token expired, signature failed),
 * 404 is the "your device or its owning user has been removed
 * server-side" path. Either way the recovery is identical — drop the
 * stale keychain entry and bounce the user to the sign-in flow.
 *
 * Bundling them under one predicate keeps the auth flows in this
 * file from forgetting one of the two whenever they handle the other.
 */
function isStaleCredentialError(err: unknown): boolean {
    return isUnauthorizedError(err) || isNotFoundError(err);
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

function readErrorField(body: unknown): null | string {
    if (body == null || typeof body !== "object") return null;
    const errorField = (body as { error?: unknown }).error;
    if (typeof errorField === "string" && errorField.length > 0) {
        return errorField;
    }
    if (errorField != null && typeof errorField === "object") {
        const message = (errorField as { message?: unknown }).message;
        if (typeof message === "string" && message.length > 0) {
            return message;
        }
    }
    return null;
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

import { Client } from "@vex-chat/libvex";
import type { IMessage, PlatformPreset, KeyStore } from "@vex-chat/libvex";
import { $client } from "./client.ts";
import { $user } from "./user.ts";
import { $messages, $groupMessages } from "./messages.ts";
import { $servers } from "./servers.ts";
import { $channels } from "./channels.ts";
import { $permissions } from "./permissions.ts";
import { resetAll } from "./reset.ts";
import { incrementDmUnread, incrementChannelUnread } from "./unread.ts";
import { $familiars } from "./familiars.ts";
import { $keyReplaced } from "./key-replaced.ts";

/**
 * Fetches server list, channels per server, permissions, and loads
 * persisted message history from local SQLite after login.
 */
async function populateState(client: Client): Promise<void> {
    try {
        // Servers + channels
        const servers = await client.servers.retrieve();
        for (const server of servers) {
            $servers.setKey(server.serverID, server);
            const channels = await client.channels.retrieve(server.serverID);
            $channels.setKey(server.serverID, channels);

            // Load persisted group messages per channel (deduplicate by mailID)
            for (const channel of channels) {
                try {
                    const msgs = await client.messages.retrieveGroup(
                        channel.channelID,
                    );
                    if (msgs.length > 0) {
                        const seen = new Set<string>();
                        const deduped = msgs.filter((m) => {
                            if (seen.has(m.mailID)) return false;
                            seen.add(m.mailID);
                            return true;
                        });
                        $groupMessages.setKey(channel.channelID, deduped);
                    }
                } catch {
                    /* non-fatal */
                }
            }
        }

        // Permissions
        const perms = await client.permissions.retrieve();
        for (const perm of perms) {
            $permissions.setKey(perm.permissionID, perm);
        }

        // Load persisted DM history for known familiars
        try {
            const familiars = await client.users.familiars();
            for (const user of familiars) {
                $familiars.setKey(user.userID, user);
                try {
                    const msgs = await client.messages.retrieve(user.userID);
                    if (msgs.length > 0) {
                        const seen = new Set<string>();
                        const deduped = msgs.filter((m) => {
                            if (seen.has(m.mailID)) return false;
                            seen.add(m.mailID);
                            return true;
                        });
                        $messages.setKey(user.userID, deduped);
                    }
                } catch {
                    /* non-fatal */
                }
            }
        } catch {
            /* non-fatal */
        }
    } catch {
        // Non-fatal — UI will show empty state
    }
}

/** Server connection options — identical across all auth flows. */
export interface ServerOptions {
    host: string;
    unsafeHttp?: boolean;
    logLevel?: string;
    inMemoryDb?: boolean;
}

/** Result from any auth flow. */
export interface AuthResult {
    ok: boolean;
    keyReplaced?: boolean;
    error?: string;
}

/**
 * Deletes all of the current user's stale devices except the active one.
 * Prevents fan-out to abandoned device registrations when sending messages.
 */
async function cleanupStaleDevices(client: Client): Promise<void> {
    try {
        const me = client.me.user();
        const myDevice = client.me.device();
        const allDevices = await client.devices.list(me.userID);
        if (!allDevices || allDevices.length <= 1) return;

        for (const device of allDevices) {
            if (device.deviceID === myDevice.deviceID) continue;
            try {
                await client.devices.delete(device.deviceID);
            } catch {
                /* non-fatal — server may reject if device is active */
            }
        }
    } catch {
        /* non-fatal */
    }
}

/**
 * Internal: creates the Client, wires events to nanostores atoms.
 * All public auth flows call this after obtaining a private key.
 */
async function initClient(
    privateKey: string,
    preset: PlatformPreset,
    options: ServerOptions,
): Promise<Client> {
    resetAll();

    const storage = await preset.createStorage(
        "vex-client.db",
        privateKey,
        preset.adapters.logger,
    );
    const client = await Client.create(
        privateKey,
        { ...options, adapters: preset.adapters } as any,
        storage,
    );
    $client.set(client);

    // Wire real-time events
    client.on("message", (msg: IMessage) => {
        const me = $user.get();
        if (msg.group) {
            const prev = $groupMessages.get()[msg.group] ?? [];
            if (!prev.some((m) => m.mailID === msg.mailID)) {
                $groupMessages.setKey(msg.group, [...prev, msg]);
                if (me && msg.authorID !== me.userID)
                    incrementChannelUnread(msg.group);
            }
        } else {
            const isOwnMessage = me && msg.authorID === me.userID;
            const threadKey = isOwnMessage ? msg.readerID : msg.authorID;
            const prev = $messages.get()[threadKey] ?? [];

            if (!prev.some((m) => m.mailID === msg.mailID)) {
                $messages.setKey(threadKey, [...prev, msg]);
                if (!isOwnMessage) incrementDmUnread(threadKey);

                const otherUserID = threadKey;
                if (!$familiars.get()[otherUserID]) {
                    $familiars.setKey(otherUserID, {
                        userID: otherUserID,
                        username: otherUserID.slice(0, 8),
                        lastSeen: new Date(),
                    });
                    client.users
                        .retrieve(otherUserID)
                        .then(([u]) => {
                            if (u) $familiars.setKey(otherUserID, u);
                        })
                        .catch(() => {});
                }
            }
        }
    });

    return client;
}

/**
 * Register a new account → save credentials → connect.
 * One call replaces: Client.create + register + keyStore.save + connect + event wiring.
 */
export async function registerAndBootstrap(
    username: string,
    password: string,
    preset: PlatformPreset,
    options: ServerOptions,
    keyStore: KeyStore,
): Promise<AuthResult> {
    try {
        const privateKey = Client.generateSecretKey();
        const client = await initClient(privateKey, preset, options);

        const [user, regErr] = await client.register(username, password);
        if (regErr || !user) {
            return {
                ok: false,
                error: regErr?.message ?? "Registration failed",
            };
        }

        // login() sets the auth cookie needed by connect()
        const loginErr = await client.login(username, password);
        if (loginErr) {
            return {
                ok: false,
                error: "Registered but login failed: " + loginErr.message,
            };
        }

        // connect() populates device details and authenticates
        await client.connect();
        const currentUser = client.me.user();
        $user.set(currentUser);

        try {
            const toSave = {
                username,
                deviceID: client.me.device().deviceID,
                deviceKey: privateKey,
                token: "",
            };
            preset.adapters.logger.warn(
                "[vex-store] register: saving creds for " + toSave.username,
            );
            await keyStore.save(toSave);
            preset.adapters.logger.warn("[vex-store] register: creds saved");
        } catch (saveErr: any) {
            preset.adapters.logger.warn(
                "[vex-store] register: keyStore.save failed: " +
                    saveErr?.message,
            );
        }

        await populateState(client);
        cleanupStaleDevices(client); // fire-and-forget

        return { ok: true };
    } catch (err: any) {
        return { ok: false, error: err?.message ?? "Unknown error" };
    }
}

/**
 * Login with existing credentials → save credentials → connect.
 * If no device exists on this machine, registers a new device automatically.
 */
export async function loginAndBootstrap(
    username: string,
    password: string,
    preset: PlatformPreset,
    options: ServerOptions,
    keyStore: KeyStore,
): Promise<AuthResult> {
    try {
        // Check if we have a saved device key for this username
        const creds = await keyStore.load(username);
        const privateKey = creds?.deviceKey ?? Client.generateSecretKey();

        const client = await initClient(privateKey, preset, options);
        const loginErr = await client.login(username, password);

        if (loginErr) {
            return { ok: false, error: "Invalid username or password" };
        }

        // connect() populates device details and authenticates
        await client.connect();
        $user.set(client.me.user());

        if (!creds) {
            // First login on this machine — register a new device
            preset.adapters.logger.warn(
                "[vex-store] No saved creds for " +
                    username +
                    " — registering new device",
            );
            try {
                await client.devices.register();
                preset.adapters.logger.warn(
                    "[vex-store] Device registered: " +
                        client.me.device().deviceID,
                );
            } catch (regErr: any) {
                // 470 = device with this signing key already exists — that's OK, reuse it
                if (regErr?.response?.status !== 470) {
                    preset.adapters.logger.warn(
                        "[vex-store] device registration failed: " +
                            regErr?.message,
                    );
                }
            }
            try {
                const toSave = {
                    username,
                    deviceID: client.me.device().deviceID,
                    deviceKey: privateKey,
                    token: "",
                };
                preset.adapters.logger.warn(
                    "[vex-store] Saving creds: " +
                        JSON.stringify({
                            username: toSave.username,
                            deviceID: toSave.deviceID,
                        }),
                );
                await keyStore.save(toSave);
                preset.adapters.logger.warn(
                    "[vex-store] Creds saved successfully",
                );
            } catch (saveErr: any) {
                preset.adapters.logger.warn(
                    "[vex-store] keyStore.save failed: " + saveErr?.message,
                );
            }
        } else {
            // Existing creds — update the token
            try {
                await keyStore.save({
                    ...creds,
                    token: "",
                });
            } catch {
                /* non-fatal */
            }
        }

        // Populate servers and channels
        await populateState(client);
        cleanupStaleDevices(client); // fire-and-forget

        return { ok: true };
    } catch (err: any) {
        return { ok: false, error: err?.message ?? "Unknown error" };
    }
}

/**
 * Auto-login from stored credentials → connect.
 * Returns { ok: false } if no credentials found.
 */
export async function autoLogin(
    keyStore: KeyStore,
    preset: PlatformPreset,
    options: ServerOptions,
): Promise<AuthResult> {
    const creds = await keyStore.load();
    if (!creds) return { ok: false };

    try {
        const client = await initClient(creds.deviceKey, preset, options);
        await client.connect();
        $user.set(client.me.user());

        await populateState(client);
        cleanupStaleDevices(client); // fire-and-forget
        return { ok: true };
    } catch (err: any) {
        if ($keyReplaced.get()) return { ok: false, keyReplaced: true };
        return { ok: false, error: err?.message ?? "Unknown error" };
    }
}

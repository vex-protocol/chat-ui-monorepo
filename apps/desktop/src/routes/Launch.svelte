<script lang="ts">
    import { onMount, tick } from "svelte";
    import { push } from "svelte-spa-router";

    import { getServerOptions } from "../lib/config.js";
    import { keyStore } from "../lib/keystore.js";
    import Loading from "../lib/Loading.svelte";
    import { desktopConfig } from "../lib/platform.js";
    import {
        channels as channelsAtom,
        servers as serversAtom,
        user,
        vexService,
    } from "../lib/store/index.js";

    onMount(() => {
        void (async () => {
            try {
                const result = await Promise.race([
                    vexService.autoLogin(
                        keyStore,
                        desktopConfig(),
                        getServerOptions(),
                    ),
                    new Promise<{ ok: false }>((resolve) =>
                        setTimeout(() => resolve({ ok: false }), 15_000),
                    ),
                ]);

                if (!result.ok) {
                    await tick();
                    void push("/login");
                    return;
                }

                const u = user.get();
                if (!u) {
                    await tick();
                    void push("/login");
                    return;
                }

                const serverList = Object.values(serversAtom.get());
                console.log(
                    "[launch] servers:",
                    serverList.length,
                    "user:",
                    u.username,
                );
                if (serverList.length > 0) {
                    const firstServer = serverList[0];
                    if (!firstServer) {
                        await tick();
                        window.location.hash = "#/home";
                        return;
                    }
                    const sid = firstServer.serverID;
                    const chs = channelsAtom.get()[sid] ?? [];
                    console.log("[launch] channels for", sid, ":", chs.length);
                    const firstChannel = chs[0];
                    if (firstChannel) {
                        const target = `/server/${sid}/${firstChannel.channelID}`;
                        console.log("[launch] navigating to", target);
                        await tick();
                        window.location.hash = `#${target}`;
                    } else {
                        console.log("[launch] no channels, going to /home");
                        await tick();
                        window.location.hash = "#/home";
                    }
                } else {
                    console.log("[launch] no servers, going to /home");
                    await tick();
                    window.location.hash = "#/home";
                }
            } catch {
                await tick();
                void push("/login");
            }
        })();
    });
</script>

<div class="launch">
    <Loading label="Connecting to server..." size="lg" />
</div>

<style>
    .launch {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-primary);
    }
</style>

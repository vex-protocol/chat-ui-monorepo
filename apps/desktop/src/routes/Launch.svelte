<script lang="ts">
    import { onMount, tick } from "svelte";
    import { replace } from "svelte-spa-router";

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
                    replace("/login");
                    return;
                }

                const u = user.get();
                if (!u) {
                    await tick();
                    replace("/login");
                    return;
                }

                const serverList = Object.values(serversAtom.get());
                if (serverList.length > 0) {
                    const sid = serverList[0].serverID;
                    const chs = channelsAtom.get()[sid] ?? [];
                    if (chs.length > 0) {
                        replace(`/server/${sid}/${chs[0].channelID}`);
                    } else {
                        replace("/home");
                    }
                } else {
                    replace("/home");
                }
            } catch {
                await tick();
                replace("/login");
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

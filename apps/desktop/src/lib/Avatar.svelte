<script lang="ts">
    import { avatarHue } from "./store/index.js";

    interface Props {
        /** Display name or username for initials fallback */
        name?: string;
        serverUrl: string;
        size?: number;
        userID: string;
        /** Cache-bust version — increment after upload to force reload */
        version?: number;
    }

    let { name, serverUrl, size, userID, version }: Props = $props();
    // Fallback resolved outside the destructure — eslint --fix
    // silently strips destructure defaults on svelte files.
    const resolvedSize = $derived(size ?? 36);

    let failed = $state(false);

    // Re-attempt image load whenever version changes (after upload)
    $effect(() => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        version;
        failed = false;
    });

    function initials(id: string, displayName?: string): string {
        if (displayName) return displayName.slice(0, 2).toUpperCase();
        return id.slice(0, 2).toUpperCase();
    }
</script>

{#if !failed}
    <img
        src="{serverUrl}/avatar/{userID}?v={version}"
        alt={name ?? userID}
        width={resolvedSize}
        height={resolvedSize}
        class="avatar"
        style="width:{resolvedSize}px;height:{resolvedSize}px;border-radius:50%"
        onerror={() => {
            failed = true;
        }}
    />
{:else}
    <div
        class="avatar avatar--fallback"
        style="width:{resolvedSize}px;height:{resolvedSize}px;font-size:{Math.round(
            resolvedSize * 0.4,
        )}px;background:hsl({avatarHue(userID)},45%,40%)"
        aria-label={name ?? userID}
    >
        {initials(userID, name)}
    </div>
{/if}

<style>
    .avatar {
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
        display: inline-flex;
    }

    .avatar--fallback {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-weight: 700;
        letter-spacing: 0.02em;
        user-select: none;
    }
</style>

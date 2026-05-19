<script lang="ts">
    import type { User } from "@vex-chat/libvex";

    import Avatar from "./Avatar.svelte";
    import { getServerUrl } from "./config.js";

    let {
        canKick,
        kicking,
        onKick,
        online,
        owner,
        user,
    }: {
        canKick: boolean;
        kicking: boolean;
        onKick: (member: User) => Promise<void>;
        online: boolean;
        owner: boolean;
        user: User;
    } = $props();
</script>

<div class:member--offline={!online} class="member">
    <div class="member__avatar-wrap">
        <Avatar
            userID={user.userID}
            serverUrl={getServerUrl()}
            size={28}
            name={user.username}
        />
        {#if online}
            <span class="member__dot member__dot--online"></span>
        {/if}
    </div>
    <span class="member__name" title={user.username}>
        {user.username}
        {#if owner}
            <span class="member__crown" aria-label="Server owner">♕</span>
        {/if}
    </span>
    {#if canKick || kicking}
        <button
            class="member__kick"
            disabled={kicking}
            onclick={() => {
                void onKick(user);
            }}
        >
            {kicking ? "Kicking..." : "Kick"}
        </button>
    {/if}
</div>

<style>
    .member {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px;
        border-radius: 4px;
        transition: background 0.1s;
    }

    .member:hover {
        background: var(--bg-hover);
    }

    .member--offline {
        opacity: 0.5;
    }

    .member__avatar-wrap {
        position: relative;
        flex-shrink: 0;
    }

    .member__dot {
        position: absolute;
        bottom: -1px;
        right: -1px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        border: 2px solid var(--bg-secondary);
    }

    .member__dot--online {
        background: var(--success);
    }

    .member__name {
        font-size: 13px;
        color: var(--text-primary);
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .member__crown {
        color: #ffd76a;
        margin-left: 4px;
    }

    .member__kick {
        border: 1px solid rgba(255, 122, 122, 0.48);
        border-radius: 4px;
        background: transparent;
        color: var(--danger);
        cursor: pointer;
        flex-shrink: 0;
        font-size: 11px;
        font-weight: 700;
        padding: 3px 6px;
    }

    .member__kick:disabled {
        cursor: default;
        opacity: 0.45;
    }
</style>

<script lang="ts">
	import { Meta } from '$lib/seo';
	import { page } from '$app/state';

	let { data } = $props();

	const inviteUrl = `vex://invite/${page.params.id}`;

	let showDownload = $state(false);

	function openInVex() {
		window.location.href = inviteUrl;
		setTimeout(() => {
			showDownload = true;
		}, 2000);
	}
</script>

{#if data.invite && !data.error}
	<Meta
		title="Join {data.invite.serverName} on Vex"
		description="You've been invited to {data.invite.serverName} on Vex — end-to-end encrypted chat."
		path="/invite/{page.params.id}"
	/>
{:else if data.error === 'expired'}
	<Meta
		title="Invite Expired"
		description="This invite link has expired."
		path="/invite/{page.params.id}"
	/>
{:else}
	<Meta
		title="Invite Not Found"
		description="This invite link is invalid or has been revoked."
		path="/invite/{page.params.id}"
	/>
{/if}

<main class="invite">
	{#if data.invite && !data.error}
		<div class="card">
			<h1>{data.invite.serverName}</h1>
			<p>You've been invited to join this server on Vex.</p>

			<button onclick={openInVex} class="primary">Open in Vex</button>

			{#if showDownload}
				<p class="fallback">
					Don't have Vex? <a href="/download">Download it here</a>
				</p>
			{/if}

			<p class="invite-code">
				Invite code: <code>{data.invite.inviteID}</code>
			</p>
		</div>
	{:else if data.error === 'expired'}
		<div class="card">
			<h1>Invite Expired</h1>
			<p>This invite link is no longer valid. Ask the server owner for a new one.</p>
		</div>
	{:else}
		<div class="card">
			<h1>Invite Not Found</h1>
			<p>This invite link is invalid or has been revoked.</p>
		</div>
	{/if}
</main>

<style>
	.invite {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		padding: 2rem;
	}

	.card {
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 2.5rem;
		max-width: 420px;
		width: 100%;
		text-align: center;
	}

	h1 {
		font-size: 1.5rem;
		margin: 0 0 0.75rem;
	}

	p {
		color: var(--text-secondary);
		margin: 0 0 1.5rem;
	}

	button.primary {
		background: var(--accent);
		color: white;
		border: none;
		border-radius: 8px;
		padding: 0.75rem 2rem;
		font-size: 1rem;
		cursor: pointer;
		width: 100%;
	}

	button.primary:hover {
		background: var(--accent-hover);
	}

	.fallback {
		margin-top: 1rem;
		font-size: 0.875rem;
	}

	.fallback a {
		color: var(--accent);
		text-decoration: underline;
	}

	.invite-code {
		margin-top: 1.5rem;
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	code {
		background: var(--bg-tertiary);
		padding: 0.2rem 0.4rem;
		border-radius: 4px;
		font-size: 0.75rem;
	}
</style>

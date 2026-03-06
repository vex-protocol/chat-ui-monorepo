<script lang="ts">
	import { Meta } from '$lib/seo';
	import { GITHUB_ORG } from '$lib/config';
	import type { PageData } from './$types';

	let { data } = $props();

	const platform = $derived.by(() => {
		if (typeof navigator === 'undefined') return 'unknown';
		const ua = navigator.userAgent.toLowerCase();
		if (ua.includes('mac')) return 'macos';
		if (ua.includes('win')) return 'windows';
		if (ua.includes('linux')) return 'linux';
		return 'unknown';
	});
</script>

<Meta
	title="Download"
	description="Download Vex for macOS, Windows, and Linux. Free, open source, end-to-end encrypted chat."
	path="/download"
/>

<div class="download">
	<section id="download-hero" class="hero">
		<h1>Download Vex</h1>
		<p class="subtitle">Free and open source. Available for macOS, Windows, and Linux.</p>
	</section>

	<section id="download-releases" class="section">
		{#if data.release}
			<p class="version">Latest: {data.release.tag}</p>

			<div class="platforms">
				{#each data.release.assets as asset}
					<a
						href={asset.url}
						class="platform-btn"
						class:highlighted={asset.platform === platform}
						download
					>
						<span class="platform-name">{asset.label}</span>
						<span class="platform-size">{asset.size}</span>
					</a>
				{/each}
			</div>
		{:else}
			<p class="coming-soon">Desktop builds coming soon. Follow development on <a href="{GITHUB_ORG}">GitHub</a>.</p>
		{/if}

		<div class="source">
			<p>
				Or build from source:
				<a href="{GITHUB_ORG}/vex-chat">github.com/vex-chat/vex-chat</a>
			</p>
		</div>
	</section>
</div>

<style>
	.download {
		max-width: 600px;
		margin: 0 auto;
		padding: 6rem 1.5rem 4rem;
	}

	.hero {
		min-height: 50vh;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	h1 {
		font-size: 2.5rem;
		margin: 0 0 1rem;
	}

	.subtitle {
		font-size: 1.15rem;
		color: var(--text-secondary);
	}

	.section {
		padding: 2rem 0 4rem;
	}

	.version {
		color: var(--text-muted);
		font-size: 0.85rem;
		margin-bottom: 1.5rem;
	}

	.platforms {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.platform-btn {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.25rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--bg-secondary);
		color: var(--text-primary);
		text-decoration: none;
		transition: border-color 0.2s;
	}

	.platform-btn:hover {
		border-color: var(--accent);
	}

	.platform-btn.highlighted {
		border-color: var(--accent);
		background: var(--bg-tertiary);
	}

	.platform-size {
		color: var(--text-muted);
		font-size: 0.85rem;
	}

	.coming-soon {
		color: var(--text-secondary);
		font-size: 1.1rem;
	}

	.coming-soon a {
		color: var(--accent);
	}

	.source {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border);
	}

	.source p {
		color: var(--text-muted);
		font-size: 0.85rem;
	}

	.source a {
		color: var(--accent);
	}

	@media (max-width: 768px) {
		.download { padding: 5rem 1rem 3rem; }
		h1 { font-size: 2rem; }
	}
</style>

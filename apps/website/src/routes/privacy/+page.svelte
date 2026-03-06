<script lang="ts">
	import { Meta } from '$lib/seo';
	import type { PageData } from './$types';

	let { data } = $props();

	const formattedDate = $derived.by(() => {
		if (!data.lastUpdated) return null;
		return new Date(data.lastUpdated).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	});
</script>

<Meta
	title="Privacy Policy"
	description="Vex privacy policy. What we collect, what we don't, and why."
	path="/privacy"
/>

<div class="privacy">
	<section id="privacy-hero" class="hero">
		<h1>Privacy Policy</h1>
		{#if formattedDate}
			<p class="last-updated">Last updated: {formattedDate}</p>
		{/if}
	</section>

	<section id="privacy-content" class="section">
		{#if data.markdown}
			{@html renderMarkdown(data.markdown)}
		{:else}
			<p>
				Privacy policy is available at
				<a href="https://github.com/vex-chat/vex-privacy-policy">github.com/vex-chat/vex-privacy-policy</a>.
			</p>
		{/if}
	</section>
</div>

<script lang="ts" module>
	function renderMarkdown(md: string): string {
		// Simple markdown to HTML — handles headers, paragraphs, lists, bold, links
		return md
			.split('\n\n')
			.map((block) => {
				block = block.trim();
				if (!block) return '';
				if (block.startsWith('# '))
					return ''; // Skip title — we have our own h1
				if (block.startsWith('## '))
					return `<h2>${escapeHtml(block.slice(3))}</h2>`;
				if (block.startsWith('### '))
					return `<h3>${escapeHtml(block.slice(4))}</h3>`;
				if (block.startsWith('- ') || block.startsWith('* ')) {
					const items = block
						.split('\n')
						.filter((l) => l.startsWith('- ') || l.startsWith('* '))
						.map((l) => `<li>${inlineFormat(l.slice(2))}</li>`)
						.join('');
					return `<ul>${items}</ul>`;
				}
				return `<p>${inlineFormat(block)}</p>`;
			})
			.join('\n');
	}

	function escapeHtml(s: string): string {
		return s
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	function inlineFormat(s: string): string {
		return escapeHtml(s)
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" rel="noopener">$1</a>');
	}
</script>

<style>
	.privacy {
		max-width: 720px;
		margin: 0 auto;
		padding: 6rem 1.5rem 4rem;
	}

	.hero {
		min-height: 40vh;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	h1 {
		font-size: 2.5rem;
		margin: 0 0 0.5rem;
	}

	.last-updated {
		color: var(--text-muted);
		font-size: 0.85rem;
	}

	.section {
		padding: 2rem 0 4rem;
	}

	.section :global(h2) {
		font-size: 1.4rem;
		margin: 2.5rem 0 0.75rem;
		color: var(--text-primary);
	}

	.section :global(h3) {
		font-size: 1.1rem;
		margin: 2rem 0 0.5rem;
		color: var(--text-primary);
	}

	.section :global(p) {
		color: var(--text-secondary);
		line-height: 1.7;
		margin: 0 0 1rem;
	}

	.section :global(ul) {
		color: var(--text-secondary);
		line-height: 1.7;
		padding-left: 1.5rem;
		margin: 0 0 1.5rem;
	}

	.section :global(a) {
		color: var(--accent);
	}

	.section :global(strong) {
		color: var(--text-primary);
	}

	@media (max-width: 768px) {
		.privacy { padding: 5rem 1rem 3rem; }
		h1 { font-size: 2rem; }
	}
</style>

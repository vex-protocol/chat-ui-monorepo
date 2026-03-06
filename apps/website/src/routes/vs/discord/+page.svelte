<script>
	import { Meta, JsonLd } from '$lib/seo';
	import { discord, vex } from '$lib/data/competitors';
</script>

<Meta
	title="Vex vs Discord — Private Alternative to Discord"
	description="Discord reads every message you send. Vex gives you servers and channels with end-to-end encryption on everything. Open source, self-hostable, zero tracking."
	path="/vs/discord"
/>

<JsonLd
	schema={{
		'@context': 'https://schema.org',
		'@type': 'WebPage',
		name: 'Vex vs Discord — Private Alternative to Discord',
		description: 'Discord reads every message you send. Vex gives you encrypted servers and channels.',
		url: 'https://vex.wtf/vs/discord',
		breadcrumb: {
			'@type': 'BreadcrumbList',
			itemListElement: [
				{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://vex.wtf' },
				{ '@type': 'ListItem', position: 2, name: 'Vex vs Discord', item: 'https://vex.wtf/vs/discord' },
			],
		},
	}}
/>

<div class="page">
	<section id="vs-discord-hero" class="hero">
		<h1>Vex vs Discord</h1>
		<p class="subtitle">
			Same model — servers, channels, DMs. One difference: Discord reads everything you type.
			Vex encrypts it before it leaves your device.
		</p>
	</section>

	<section class="section">
		<h2>TL;DR</h2>
		<p>
			Discord is the best community platform ever built — if you don't care about privacy. The UX
			is excellent, the ecosystem is massive, and the free tier is generous. But Discord has zero
			end-to-end encryption. Every message, every file, every voice chat — Discord's servers see
			it all in plaintext. Vex brings the same collaboration model with E2E encryption on
			everything.
		</p>
	</section>

	<section class="section">
		<h2>Feature Comparison</h2>
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th scope="col">Feature</th>
						<th scope="col">Vex</th>
						<th scope="col">Discord</th>
					</tr>
				</thead>
				<tbody>
					{#each discord.features as f}
						<tr>
							<td>{f.label}</td>
							<td class={f.vex}>{f.vexNote}</td>
							<td class={f.competitor}>{f.competitorNote}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section class="section">
		<h2>Where Discord Wins</h2>
		<ul>
			{#each discord.strengths as s}
				<li>{s}</li>
			{/each}
		</ul>
		<p>
			Discord is a mature platform with years of polish. Voice channels, screen sharing, forums,
			stages, thousands of bots — it's an ecosystem, not just a chat app. Vex doesn't have any of
			that yet. If you need those features more than you need privacy, Discord is the pragmatic
			choice.
		</p>
	</section>

	<section class="section">
		<h2>Where Vex Wins</h2>
		<ul>
			{#each vex.strengths as s}
				<li>{s}</li>
			{/each}
		</ul>
	</section>

	<section class="section">
		<h2>The Privacy Problem With Discord</h2>
		<p>
			Discord's business model requires reading your messages. Their
			<a href="https://discord.com/privacy" target="_blank" rel="noopener">privacy policy</a>
			is explicit: they collect message content, voice data, device information, IP addresses,
			and behavioral analytics. They share this data with advertisers and "business partners."
		</p>
		<p>This isn't a bug — it's the product. When the service is free, you're what's being sold.</p>
		<ul>
			<li>Every message stored in plaintext on Discord's servers</li>
			<li>Behavioral profiling across servers and channels</li>
			<li>Data shared with third-party advertisers</li>
			<li>No way to verify what they do with your data (closed source)</li>
			<li>Account bans delete years of history with no recourse</li>
		</ul>
		<p>
			Vex stores only ciphertext. The server cannot read your messages — not by policy, but by
			math. There's nothing to sell, nothing to profile, nothing to hand over.
		</p>
	</section>

	<section class="section">
		<h2>Self-Hosting: Own Your Community</h2>
		<p>
			Discord communities exist at Discord's discretion. They can ban your server, disable your
			account, or change the rules at any time. You can't export your server. You can't back
			it up. You can't move it somewhere else.
		</p>
		<p>
			With Vex, you run the server. Your data lives on your hardware. No one can take it away,
			shut it down, or decide your community violates their terms. Self-hosting means sovereignty.
		</p>
	</section>

	<section class="section">
		<h2>What Vex Is Missing</h2>
		<p>We're building in the open, so here's what Discord has that Vex doesn't — yet:</p>
		<ul>
			<li><strong>Voice and video</strong> — Discord's voice channels are excellent; Vex is text-only for now</li>
			<li><strong>Bot ecosystem</strong> — Thousands of Discord bots; Vex has no bot API yet</li>
			<li><strong>Threads and forums</strong> — Discord's forum channels are great for async discussion</li>
			<li><strong>Screen sharing</strong> — Not available in Vex</li>
			<li><strong>Emoji and reactions</strong> — Custom emoji aren't implemented yet</li>
			<li><strong>User base</strong> — Discord has 200M+ MAU; Vex is early</li>
		</ul>
		<p>
			Vex is younger. If you need those features today, Discord delivers. If you need privacy
			today and can wait for the ecosystem to mature, Vex is where you should be.
		</p>
	</section>

	<section class="section">
		<h2>Who Should Use What</h2>
		<div class="verdict">
			<div class="verdict-card">
				<h3>Use Discord if</h3>
				<ul>
					<li>You need voice channels and screen sharing</li>
					<li>Bot integrations are critical for your workflow</li>
					<li>You're building a large public community</li>
					<li>Privacy is not a concern for your use case</li>
				</ul>
			</div>
			<div class="verdict-card">
				<h3>Use Vex if</h3>
				<ul>
					<li>You need end-to-end encryption on everything</li>
					<li>You want to own your community's data</li>
					<li>You don't want to be profiled and sold to advertisers</li>
					<li>You need servers and channels without the surveillance</li>
				</ul>
			</div>
		</div>
		<p>
			The question is simple: do you trust a corporation with every message your community sends?
			If yes, Discord is excellent. If no, Vex exists.
		</p>
	</section>
</div>

<style>
	.page {
		max-width: 720px;
		margin: 0 auto;
		padding: 6rem 1.5rem 4rem;
	}

	.hero {
		min-height: 60vh;
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
		line-height: 1.7;
		max-width: 600px;
	}

	.section {
		padding: 4rem 0;
	}

	h2 {
		font-size: 1.5rem;
		margin: 0 0 1rem;
		color: var(--text-primary);
	}

	h3 {
		font-size: 1.1rem;
		margin: 0 0 0.75rem;
		color: var(--text-primary);
	}

	p {
		color: var(--text-secondary);
		line-height: 1.7;
		margin: 0 0 1rem;
	}

	a {
		color: var(--accent);
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
	}

	ul {
		color: var(--text-secondary);
		line-height: 1.7;
		padding-left: 1.5rem;
		margin: 0 0 1.5rem;
	}

	li {
		margin-bottom: 0.4rem;
	}

	.table-wrap {
		overflow-x: auto;
		margin: 1rem 0 1.5rem;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	th,
	td {
		text-align: left;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--border);
	}

	th {
		color: var(--text-primary);
		font-weight: 600;
	}

	td {
		color: var(--text-secondary);
	}

	td:first-child {
		color: var(--text-primary);
		font-weight: 500;
		white-space: nowrap;
	}

	td.yes {
		color: #4ade80;
	}

	td.no {
		color: #f87171;
	}

	td.partial {
		color: #fbbf24;
	}

	.verdict {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		margin: 1.5rem 0;
	}

	.verdict-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 1.5rem;
	}

	.verdict-card ul {
		margin: 0;
	}

	@media (max-width: 768px) {
		.page {
			padding: 5rem 1rem 3rem;
		}

		h1 {
			font-size: 2rem;
		}

		.hero {
			min-height: 50vh;
		}

		.verdict {
			grid-template-columns: 1fr;
		}
	}
</style>

<script>
	import { Meta, JsonLd } from '$lib/seo';
	import { signal, discord } from '$lib/data/competitors';
</script>

<Meta
	title="Signal vs Discord — Which Should You Use?"
	description="Signal gives you encryption but no collaboration features. Discord gives you servers but reads everything. Vex combines both: encrypted servers and channels."
	path="/compare/signal-vs-discord"
/>

<JsonLd
	schema={{
		'@context': 'https://schema.org',
		'@type': 'WebPage',
		name: 'Signal vs Discord — Which Should You Use?',
		description: 'Signal gives you encryption. Discord gives you servers. Vex combines both.',
		url: 'https://vex.wtf/compare/signal-vs-discord',
		breadcrumb: {
			'@type': 'BreadcrumbList',
			itemListElement: [
				{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://vex.wtf' },
				{ '@type': 'ListItem', position: 2, name: 'Signal vs Discord', item: 'https://vex.wtf/compare/signal-vs-discord' },
			],
		},
	}}
/>

<div class="page">
	<section id="compare-hero" class="hero">
		<h1>Signal vs Discord</h1>
		<p class="subtitle">
			Privacy or features? Signal encrypts everything but only does messaging. Discord does
			everything but encrypts nothing. What if you didn't have to choose?
		</p>
	</section>

	<section id="compare-tldr" class="section">
		<h2>TL;DR</h2>
		<p>
			Signal is the best private messenger. Discord is the best community platform. They serve
			completely different purposes, and comparing them head-to-head is a bit like comparing a
			vault to a shopping mall. But if you're here, you're probably looking for something that
			has Signal's encryption with Discord's collaboration model. That's Vex.
		</p>
	</section>

	<section id="compare-table" class="section">
		<h2>Three-Way Comparison</h2>
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th scope="col">Feature</th>
						<th scope="col">Signal</th>
						<th scope="col">Discord</th>
						<th scope="col">Vex</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>E2E encryption</td>
						<td class="yes">All messages</td>
						<td class="no">None</td>
						<td class="yes">All messages</td>
					</tr>
					<tr>
						<td>Servers and channels</td>
						<td class="no">Group chats only</td>
						<td class="yes">Industry-leading</td>
						<td class="yes">Encrypted servers</td>
					</tr>
					<tr>
						<td>Self-hostable</td>
						<td class="partial">Technically, not practically</td>
						<td class="no">Cloud only</td>
						<td class="yes">Designed for it</td>
					</tr>
					<tr>
						<td>Open source</td>
						<td class="yes">AGPL-3.0</td>
						<td class="no">Closed</td>
						<td class="yes">AGPL-3.0</td>
					</tr>
					<tr>
						<td>Identity model</td>
						<td class="partial">Phone number</td>
						<td class="no">Email + phone</td>
						<td class="yes">Device key pair</td>
					</tr>
					<tr>
						<td>Voice/video calls</td>
						<td class="yes">Encrypted calls</td>
						<td class="yes">Voice channels, streaming</td>
						<td class="no">Not yet</td>
					</tr>
					<tr>
						<td>Bot ecosystem</td>
						<td class="no">None</td>
						<td class="yes">Thousands of bots</td>
						<td class="no">Not yet</td>
					</tr>
					<tr>
						<td>Analytics/tracking</td>
						<td class="yes">Minimal</td>
						<td class="no">Extensive profiling</td>
						<td class="yes">Zero</td>
					</tr>
					<tr>
						<td>User base</td>
						<td class="yes">40M+ users</td>
						<td class="yes">200M+ MAU</td>
						<td class="no">Early stage</td>
					</tr>
					<tr>
						<td>Cost</td>
						<td class="yes">Free (nonprofit)</td>
						<td class="partial">Free tier + Nitro ($3-10/mo)</td>
						<td class="yes">Free (self-hosted)</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>

	<section id="compare-signal" class="section">
		<h2>Signal: Maximum Privacy, Minimum Features</h2>
		<h3>Strengths</h3>
		<ul>
			{#each signal.strengths as s}
				<li>{s}</li>
			{/each}
		</ul>
		<h3>Limitations</h3>
		<ul>
			{#each signal.weaknesses as w}
				<li>{w}</li>
			{/each}
		</ul>
		<p>{signal.idealFor}</p>
	</section>

	<section id="compare-discord" class="section">
		<h2>Discord: Maximum Features, Zero Privacy</h2>
		<h3>Strengths</h3>
		<ul>
			{#each discord.strengths as s}
				<li>{s}</li>
			{/each}
		</ul>
		<h3>Limitations</h3>
		<ul>
			{#each discord.weaknesses as w}
				<li>{w}</li>
			{/each}
		</ul>
		<p>{discord.idealFor}</p>
	</section>

	<section id="compare-gap" class="section">
		<h2>The Gap Between Them</h2>
		<p>
			There's a category of user that neither Signal nor Discord serves well: people who need
			<em>both</em> team collaboration features <em>and</em> end-to-end encryption.
		</p>
		<ul>
			<li>A small company that needs channels and can't have messages on someone else's servers</li>
			<li>An activist group that needs to organize across topics, not just in a single chat thread</li>
			<li>An open source project that wants Discord-style community without the surveillance</li>
			<li>A group of friends who want servers and channels but don't want to be profiled</li>
		</ul>
		<p>
			Signal tells these users: "just use group chats." Discord tells them: "just trust us."
			Neither answer is good enough.
		</p>
	</section>

	<section id="compare-vex" class="section">
		<h2>Vex: Encrypted Collaboration</h2>
		<p>
			Vex combines Signal's encryption model with Discord's collaboration model. Servers and
			channels, end-to-end encrypted. Device-key identity — no phone number, no email. Self-hostable
			so you control the metadata too.
		</p>
		<p>
			It's younger than both. It doesn't have Signal's sealed sender or Discord's voice channels.
			But it's the only platform where you can create a server, add channels, invite your team,
			and know that the server operator cannot read a single message.
		</p>
	</section>

	<section id="compare-verdict" class="section">
		<h2>Which Should You Use?</h2>
		<div class="verdict">
			<div class="verdict-card">
				<h3>Signal</h3>
				<p>Private 1:1 messaging and small groups. Your threat model is personal conversations, not team collaboration.</p>
			</div>
			<div class="verdict-card">
				<h3>Discord</h3>
				<p>Large public communities where privacy isn't a concern. You need voice, bots, and a polished ecosystem.</p>
			</div>
			<div class="verdict-card accent">
				<h3>Vex</h3>
				<p>Teams and communities that need servers and channels with E2E encryption. You want Discord's model with Signal's privacy.</p>
			</div>
		</div>
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
		margin: 2rem 0 0.75rem;
		color: var(--text-primary);
	}

	h3:first-child {
		margin-top: 0;
	}

	p {
		color: var(--text-secondary);
		line-height: 1.7;
		margin: 0 0 1rem;
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
		font-size: 0.85rem;
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
		grid-template-columns: 1fr 1fr 1fr;
		gap: 1.5rem;
		margin: 1.5rem 0;
	}

	.verdict-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 1.5rem;
	}

	.verdict-card.accent {
		border-color: var(--accent);
	}

	.verdict-card p {
		margin: 0;
		font-size: 0.9rem;
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

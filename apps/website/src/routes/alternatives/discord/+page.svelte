<script>
	import { Meta, JsonLd } from '$lib/seo';
</script>

<Meta
	title="Discord Alternatives — Private Servers Compared"
	description="Looking for a Discord alternative? Compare platforms with encrypted servers and channels. Vex, Revolt, Matrix, Rocket.Chat, and Guilded."
	path="/alternatives/discord"
/>

<JsonLd
	schema={{
		'@context': 'https://schema.org',
		'@type': 'WebPage',
		name: 'Discord Alternatives — Private Servers Compared',
		description: 'Compare Discord alternatives: Vex, Revolt, Matrix, Rocket.Chat, and Guilded.',
		url: 'https://vex.wtf/alternatives/discord',
		breadcrumb: {
			'@type': 'BreadcrumbList',
			itemListElement: [
				{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://vex.wtf' },
				{ '@type': 'ListItem', position: 2, name: 'Discord Alternatives', item: 'https://vex.wtf/alternatives/discord' },
			],
		},
	}}
/>

<div class="page">
	<section id="alts-discord-hero" class="hero">
		<h1>Discord Alternatives</h1>
		<p class="subtitle">
			Discord is great — until you realize they read every message, profile your behavior,
			and can delete your community overnight. Here are the alternatives.
		</p>
	</section>

	<section class="section">
		<h2>Why People Leave Discord</h2>
		<ul>
			<li><strong>Zero encryption</strong> — Discord stores all messages in plaintext on their servers</li>
			<li><strong>Data harvesting</strong> — Messages, behavior, device info — all collected and monetized</li>
			<li><strong>Account bans</strong> — One strike and your entire history across all servers is gone</li>
			<li><strong>No data portability</strong> — You can't export or backup your server</li>
			<li><strong>Closed source</strong> — No way to verify what happens with your data</li>
			<li><strong>No self-hosting</strong> — Discord's servers or nothing</li>
			<li><strong>Monetization pressure</strong> — Increasingly aggressive Nitro upsells</li>
		</ul>
	</section>

	<section class="section">
		<h2>The Alternatives</h2>

		<div class="alt-card featured">
			<div class="alt-header">
				<h3>Vex</h3>
				<span class="tag">E2E encrypted &middot; Servers &amp; channels &middot; Self-hosted</span>
			</div>
			<p>
				Vex is the closest thing to Discord with actual encryption. Same model — servers with
				channels, DMs, invite links — but every message is E2E encrypted before leaving your
				device. Self-hostable, open source (AGPL-3.0), zero tracking.
			</p>
			<div class="pros-cons">
				<div>
					<h4>Why choose Vex</h4>
					<ul>
						<li>Servers and channels — familiar Discord-like structure</li>
						<li>E2E encryption on everything by default</li>
						<li>Self-hostable — own your community's data</li>
						<li>No phone number or email required</li>
						<li>Fully open source (AGPL-3.0)</li>
						<li>Zero analytics, zero profiling</li>
					</ul>
				</div>
				<div>
					<h4>Tradeoffs</h4>
					<ul>
						<li>No voice or video yet</li>
						<li>No bot ecosystem</li>
						<li>No threads or forums</li>
						<li>Smaller community — early stage</li>
					</ul>
				</div>
			</div>
			<p class="best-for"><strong>Best for:</strong> Communities that want Discord's model without Discord reading everything.</p>
		</div>

		<div class="alt-card">
			<div class="alt-header">
				<h3>Revolt</h3>
				<span class="tag">Discord-like &middot; Self-hosted &middot; Open source</span>
			</div>
			<p>
				Revolt is a direct Discord clone — same UI patterns, same feature set, but open source
				and self-hostable. It's the closest 1:1 feature match to Discord in the open source
				world. No E2E encryption, but no data harvesting either when self-hosted.
			</p>
			<div class="pros-cons">
				<div>
					<h4>Why choose Revolt</h4>
					<ul>
						<li>Most Discord-like experience available</li>
						<li>Self-hostable (Docker)</li>
						<li>Open source</li>
						<li>Voice channels (in development)</li>
						<li>Bots and webhooks</li>
					</ul>
				</div>
				<div>
					<h4>Tradeoffs</h4>
					<ul>
						<li>No end-to-end encryption</li>
						<li>Self-hosted server sees plaintext</li>
						<li>Smaller ecosystem than Discord</li>
						<li>Still in active development</li>
					</ul>
				</div>
			</div>
			<p class="best-for"><strong>Best for:</strong> Users who want Discord's UX but open source and self-hosted (without E2E).</p>
		</div>

		<div class="alt-card">
			<div class="alt-header">
				<h3>Matrix / Element</h3>
				<span class="tag">Federated &middot; E2E optional &middot; Bridges</span>
			</div>
			<p>
				Matrix is a federated protocol with Element as the primary client. Supports spaces
				(similar to servers), rooms (similar to channels), and optional E2E encryption. Bridges
				let you connect to Discord, Slack, IRC, and more from a single interface.
			</p>
			<div class="pros-cons">
				<div>
					<h4>Why choose Matrix</h4>
					<ul>
						<li>Spaces and rooms — structured collaboration</li>
						<li>E2E encryption available (opt-in)</li>
						<li>Bridges to Discord, Slack, IRC</li>
						<li>Federated — multiple servers interconnect</li>
						<li>Voice and video calls</li>
					</ul>
				</div>
				<div>
					<h4>Tradeoffs</h4>
					<ul>
						<li>E2E is opt-in, not default</li>
						<li>Synapse server is resource-heavy</li>
						<li>UX has a learning curve</li>
						<li>Federation adds complexity</li>
					</ul>
				</div>
			</div>
			<p class="best-for"><strong>Best for:</strong> Tech-savvy users who want federation, bridges, and interoperability.</p>
		</div>

		<div class="alt-card">
			<div class="alt-header">
				<h3>Rocket.Chat</h3>
				<span class="tag">Self-hosted &middot; Enterprise &middot; Open source</span>
			</div>
			<p>
				Rocket.Chat is an open source Slack/Teams alternative for enterprises. Self-hostable with
				comprehensive features: channels, threads, video conferencing, omnichannel support.
				Optional E2E encryption per channel.
			</p>
			<div class="pros-cons">
				<div>
					<h4>Why choose Rocket.Chat</h4>
					<ul>
						<li>Full enterprise feature set</li>
						<li>Self-hostable (Docker, Kubernetes)</li>
						<li>Video conferencing built-in</li>
						<li>Compliance and audit features</li>
						<li>Active development, large community</li>
					</ul>
				</div>
				<div>
					<h4>Tradeoffs</h4>
					<ul>
						<li>E2E encryption is opt-in per channel</li>
						<li>Enterprise-focused — complex for small teams</li>
						<li>Resource-heavy for self-hosting</li>
						<li>Community edition has feature limits</li>
					</ul>
				</div>
			</div>
			<p class="best-for"><strong>Best for:</strong> Enterprises that need Slack features with self-hosting and compliance.</p>
		</div>

		<div class="alt-card">
			<div class="alt-header">
				<h3>Guilded</h3>
				<span class="tag">Discord-like &middot; Free features &middot; Roblox-owned</span>
			</div>
			<p>
				Guilded started as a Discord competitor with more features for free — tournaments,
				scheduling, multiple channel types. Acquired by Roblox in 2021. More generous free
				tier than Discord but similar privacy concerns.
			</p>
			<div class="pros-cons">
				<div>
					<h4>Why choose Guilded</h4>
					<ul>
						<li>More features free than Discord (streaming, scheduling)</li>
						<li>Channel categories and sub-channels</li>
						<li>Built-in tournament and calendar features</li>
						<li>Familiar Discord-like UX</li>
					</ul>
				</div>
				<div>
					<h4>Tradeoffs</h4>
					<ul>
						<li>No E2E encryption</li>
						<li>Owned by Roblox — corporate data practices</li>
						<li>Not open source</li>
						<li>Not self-hostable</li>
						<li>Smaller user base than Discord</li>
					</ul>
				</div>
			</div>
			<p class="best-for"><strong>Best for:</strong> Gaming communities that want more free features than Discord (privacy not a priority).</p>
		</div>
	</section>

	<section class="section">
		<h2>Quick Comparison</h2>
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th scope="col"></th>
						<th scope="col">Vex</th>
						<th scope="col">Revolt</th>
						<th scope="col">Matrix</th>
						<th scope="col">Rocket.Chat</th>
						<th scope="col">Guilded</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>E2E encrypted</td>
						<td class="yes">Default</td>
						<td class="no">No</td>
						<td class="partial">Opt-in</td>
						<td class="partial">Opt-in</td>
						<td class="no">No</td>
					</tr>
					<tr>
						<td>Servers/channels</td>
						<td class="yes">Yes</td>
						<td class="yes">Yes</td>
						<td class="yes">Spaces/rooms</td>
						<td class="yes">Yes</td>
						<td class="yes">Yes</td>
					</tr>
					<tr>
						<td>Self-hostable</td>
						<td class="yes">Yes</td>
						<td class="yes">Yes</td>
						<td class="yes">Yes</td>
						<td class="yes">Yes</td>
						<td class="no">No</td>
					</tr>
					<tr>
						<td>Open source</td>
						<td class="yes">AGPL</td>
						<td class="yes">AGPL</td>
						<td class="yes">Apache</td>
						<td class="yes">MIT</td>
						<td class="no">No</td>
					</tr>
					<tr>
						<td>Voice/video</td>
						<td class="no">Not yet</td>
						<td class="partial">WIP</td>
						<td class="yes">Yes</td>
						<td class="yes">Yes</td>
						<td class="yes">Yes</td>
					</tr>
					<tr>
						<td>No tracking</td>
						<td class="yes">Zero</td>
						<td class="yes">Self-hosted</td>
						<td class="yes">Self-hosted</td>
						<td class="yes">Self-hosted</td>
						<td class="no">Roblox</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>

	<section class="section">
		<h2>The Bottom Line</h2>
		<p>
			If you're leaving Discord because of privacy, your real options are Vex, Revolt, or Matrix.
			Revolt is the most Discord-like but has no encryption. Matrix has optional encryption but
			adds federation complexity. Vex is the only one with E2E encryption by default on a
			Discord-style server model.
		</p>
		<p>
			If you're leaving Discord for more features, Guilded or Rocket.Chat might fit. But if
			you're here because you don't want a corporation reading every message your community
			sends — Vex is built for you.
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
		font-size: 1.2rem;
		margin: 0;
		color: var(--text-primary);
	}

	h4 {
		font-size: 0.95rem;
		margin: 0 0 0.5rem;
		color: var(--text-primary);
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

	.alt-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 1.5rem;
		margin: 1.5rem 0;
	}

	.alt-card.featured {
		border-color: var(--accent);
	}

	.alt-header {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		margin-bottom: 1rem;
		flex-wrap: wrap;
	}

	.tag {
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.pros-cons {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		margin: 1rem 0;
	}

	.pros-cons ul {
		margin: 0;
		font-size: 0.9rem;
	}

	.best-for {
		font-size: 0.9rem;
		margin: 0;
		padding-top: 0.5rem;
		border-top: 1px solid var(--border);
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
		padding: 0.75rem 0.75rem;
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

		.pros-cons {
			grid-template-columns: 1fr;
		}
	}
</style>

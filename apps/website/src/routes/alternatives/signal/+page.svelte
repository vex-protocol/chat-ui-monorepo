<script>
	import { Meta, JsonLd } from '$lib/seo';
</script>

<Meta
	title="Signal Alternatives — Encrypted Chat Compared"
	description="Looking for a Signal alternative? Compare encrypted messaging apps with servers, channels, and no phone number. Vex, Matrix, Session, Wire, and SimpleX."
	path="/alternatives/signal"
/>

<JsonLd
	schema={{
		'@context': 'https://schema.org',
		'@type': 'WebPage',
		name: 'Signal Alternatives — Encrypted Chat Compared',
		description: 'Compare encrypted messaging apps: Vex, Matrix, Session, Wire, and SimpleX.',
		url: 'https://vex.wtf/alternatives/signal',
		breadcrumb: {
			'@type': 'BreadcrumbList',
			itemListElement: [
				{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://vex.wtf' },
				{ '@type': 'ListItem', position: 2, name: 'Signal Alternatives', item: 'https://vex.wtf/alternatives/signal' },
			],
		},
	}}
/>

<div class="page">
	<section id="alts-signal-hero" class="hero">
		<h1>Signal Alternatives</h1>
		<p class="subtitle">
			Signal set the standard for encrypted messaging. But if you need more than 1:1 chats —
			or don't want to hand over your phone number — here are the alternatives worth considering.
		</p>
	</section>

	<section class="section">
		<h2>Why People Look for Signal Alternatives</h2>
		<p>Signal is excellent. But there are legitimate reasons to look elsewhere:</p>
		<ul>
			<li><strong>Phone number requirement</strong> — Signal ties identity to your phone number, which means no anonymity without a burner</li>
			<li><strong>No team collaboration</strong> — No servers, no channels, no way to organize group conversations by topic</li>
			<li><strong>Not easily self-hosted</strong> — You're trusting Signal's infrastructure with your metadata</li>
			<li><strong>Desktop is secondary</strong> — The phone is the primary device; desktop requires phone to set up</li>
			<li><strong>Missing community features</strong> — No roles, permissions, moderation tools for groups</li>
		</ul>
	</section>

	<section class="section">
		<h2>The Alternatives</h2>

		<div class="alt-card featured">
			<div class="alt-header">
				<h3>Vex</h3>
				<span class="tag">E2E encrypted &middot; Self-hosted &middot; Open source</span>
			</div>
			<p>
				Vex is an end-to-end encrypted chat platform with servers, channels, and DMs — like
				Discord, but with Signal-level encryption on everything. No phone number required.
				Identity is a device-bound Ed25519 key pair. Fully self-hostable. AGPL-3.0.
			</p>
			<div class="pros-cons">
				<div>
					<h4>Why choose Vex</h4>
					<ul>
						<li>E2E encryption by default on all messages</li>
						<li>Servers and channels — real collaboration, not just group chats</li>
						<li>No phone number or email required</li>
						<li>Self-hostable — control your metadata</li>
						<li>Fully open source (AGPL-3.0)</li>
						<li>Zero analytics or tracking</li>
					</ul>
				</div>
				<div>
					<h4>Tradeoffs</h4>
					<ul>
						<li>Younger platform — smaller user base</li>
						<li>No voice/video calls yet</li>
						<li>No disappearing messages yet</li>
						<li>Desktop-first — mobile is early</li>
					</ul>
				</div>
			</div>
			<p class="best-for"><strong>Best for:</strong> Teams and communities that need encrypted collaboration — servers and channels with E2E.</p>
		</div>

		<div class="alt-card">
			<div class="alt-header">
				<h3>Matrix / Element</h3>
				<span class="tag">Federated &middot; E2E optional &middot; Open source</span>
			</div>
			<p>
				Matrix is a federated communication protocol. Element is the most popular client. Supports
				E2E encryption (opt-in per room), self-hosting, and bridges to other platforms. The
				federation model means no single point of control.
			</p>
			<div class="pros-cons">
				<div>
					<h4>Why choose Matrix</h4>
					<ul>
						<li>Federated — no single company controls the network</li>
						<li>Bridges to Slack, Discord, IRC, and more</li>
						<li>E2E encryption available (Megolm protocol)</li>
						<li>Self-hostable (Synapse or Dendrite servers)</li>
						<li>Mature ecosystem with many clients</li>
					</ul>
				</div>
				<div>
					<h4>Tradeoffs</h4>
					<ul>
						<li>E2E encryption is opt-in, not default</li>
						<li>Complex setup — Synapse is resource-heavy</li>
						<li>UX can be confusing (federation adds complexity)</li>
						<li>Key verification UX is clunky</li>
					</ul>
				</div>
			</div>
			<p class="best-for"><strong>Best for:</strong> Tech-savvy users who want federation and cross-platform bridges.</p>
		</div>

		<div class="alt-card">
			<div class="alt-header">
				<h3>Session</h3>
				<span class="tag">Decentralized &middot; E2E encrypted &middot; No phone number</span>
			</div>
			<p>
				Session is a fork of Signal that removes the phone number requirement and routes messages
				through a decentralized onion network (Lokinet). Strong anonymity properties. Based on
				the Oxen blockchain for node incentivization.
			</p>
			<div class="pros-cons">
				<div>
					<h4>Why choose Session</h4>
					<ul>
						<li>No phone number or email — just a Session ID</li>
						<li>Onion routing — metadata protection by design</li>
						<li>Decentralized — no central server</li>
						<li>Disappearing messages</li>
					</ul>
				</div>
				<div>
					<h4>Tradeoffs</h4>
					<ul>
						<li>Onion routing adds latency</li>
						<li>Blockchain dependency is controversial</li>
						<li>No group collaboration features (servers/channels)</li>
						<li>Smaller development team and community</li>
					</ul>
				</div>
			</div>
			<p class="best-for"><strong>Best for:</strong> Maximum anonymity — when metadata protection matters as much as content encryption.</p>
		</div>

		<div class="alt-card">
			<div class="alt-header">
				<h3>Wire</h3>
				<span class="tag">E2E encrypted &middot; Enterprise focus &middot; Open source</span>
			</div>
			<p>
				Wire offers E2E encrypted messaging, voice, and video for teams. Proteus protocol
				(based on Signal Protocol). Available as a self-hosted enterprise product. Swiss
				jurisdiction with strong privacy laws.
			</p>
			<div class="pros-cons">
				<div>
					<h4>Why choose Wire</h4>
					<ul>
						<li>E2E encrypted voice and video calls</li>
						<li>Enterprise features (admin console, SSO)</li>
						<li>Swiss jurisdiction — strong privacy protections</li>
						<li>Self-hosted enterprise option</li>
					</ul>
				</div>
				<div>
					<h4>Tradeoffs</h4>
					<ul>
						<li>Free tier is limited — enterprise is paid</li>
						<li>Smaller user base than Signal</li>
						<li>Changed ownership multiple times — trust concerns</li>
						<li>No community/server features</li>
					</ul>
				</div>
			</div>
			<p class="best-for"><strong>Best for:</strong> Enterprises that need encrypted voice/video with compliance features.</p>
		</div>

		<div class="alt-card">
			<div class="alt-header">
				<h3>SimpleX Chat</h3>
				<span class="tag">No user IDs &middot; E2E encrypted &middot; Decentralized</span>
			</div>
			<p>
				SimpleX is unique — it has no user identifiers at all. No phone number, no username,
				no account. Connections are established through one-time QR codes or links. Strong
				metadata protection through this design.
			</p>
			<div class="pros-cons">
				<div>
					<h4>Why choose SimpleX</h4>
					<ul>
						<li>No user identifiers whatsoever — strongest anonymity model</li>
						<li>E2E encrypted with double ratchet</li>
						<li>Self-hostable relay servers</li>
						<li>Disappearing messages</li>
					</ul>
				</div>
				<div>
					<h4>Tradeoffs</h4>
					<ul>
						<li>No user discovery — need out-of-band contact exchange</li>
						<li>No group collaboration features</li>
						<li>Niche — very small community</li>
						<li>UX is less polished</li>
					</ul>
				</div>
			</div>
			<p class="best-for"><strong>Best for:</strong> Users with the highest anonymity requirements — no identifier, no graph.</p>
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
						<th scope="col">Matrix</th>
						<th scope="col">Session</th>
						<th scope="col">Wire</th>
						<th scope="col">SimpleX</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>E2E by default</td>
						<td class="yes">Yes</td>
						<td class="no">Opt-in</td>
						<td class="yes">Yes</td>
						<td class="yes">Yes</td>
						<td class="yes">Yes</td>
					</tr>
					<tr>
						<td>No phone/email</td>
						<td class="yes">Yes</td>
						<td class="yes">Yes</td>
						<td class="yes">Yes</td>
						<td class="no">Email</td>
						<td class="yes">Yes</td>
					</tr>
					<tr>
						<td>Servers/channels</td>
						<td class="yes">Yes</td>
						<td class="yes">Rooms</td>
						<td class="no">No</td>
						<td class="no">No</td>
						<td class="no">No</td>
					</tr>
					<tr>
						<td>Self-hostable</td>
						<td class="yes">Yes</td>
						<td class="yes">Yes</td>
						<td class="partial">Relays</td>
						<td class="yes">Enterprise</td>
						<td class="yes">Relays</td>
					</tr>
					<tr>
						<td>Voice/video</td>
						<td class="no">No</td>
						<td class="yes">Yes</td>
						<td class="yes">Yes</td>
						<td class="yes">Yes</td>
						<td class="yes">Yes</td>
					</tr>
					<tr>
						<td>Open source</td>
						<td class="yes">AGPL</td>
						<td class="yes">Apache</td>
						<td class="yes">GPL</td>
						<td class="yes">GPL</td>
						<td class="yes">AGPL</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>

	<section class="section">
		<h2>The Bottom Line</h2>
		<p>
			Signal is an excellent messenger. If it does what you need, keep using it. But if you've
			outgrown it — if you need servers and channels, if you don't want to use your phone number,
			if you want to self-host — the alternatives are real and getting better.
		</p>
		<p>
			Vex is built for the specific gap Signal leaves: encrypted team collaboration with
			servers and channels. No phone number. Self-hostable. Open source.
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

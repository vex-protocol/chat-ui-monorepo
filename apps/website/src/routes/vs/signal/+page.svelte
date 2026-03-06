<script>
	import { Meta, JsonLd } from '$lib/seo';
	import { signal, vex } from '$lib/data/competitors';
</script>

<Meta
	title="Vex vs Signal — Encrypted Chat Comparison"
	description="How Vex compares to Signal. Both use E2E encryption by default. Vex adds servers, channels, self-hosting, and device-key identity — no phone number required."
	path="/vs/signal"
/>

<JsonLd
	schema={{
		'@context': 'https://schema.org',
		'@type': 'WebPage',
		name: 'Vex vs Signal — Encrypted Chat Comparison',
		description: 'How Vex compares to Signal. Both use E2E encryption by default.',
		url: 'https://vex.wtf/vs/signal',
		breadcrumb: {
			'@type': 'BreadcrumbList',
			itemListElement: [
				{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://vex.wtf' },
				{ '@type': 'ListItem', position: 2, name: 'Vex vs Signal', item: 'https://vex.wtf/vs/signal' },
			],
		},
	}}
/>

<div class="page">
	<section id="vs-signal-hero" class="hero">
		<h1>Vex vs Signal</h1>
		<p class="subtitle">
			Both encrypt every message by default. The difference is what else they do.
			Signal is a private messenger. Vex is a private collaboration platform.
		</p>
	</section>

	<section class="section">
		<h2>TL;DR</h2>
		<p>
			Signal is the gold standard for private 1:1 messaging — battle-tested protocol, massive
			user base, simple UX. If all you need is encrypted DMs and small group chats, Signal is
			excellent. Vex exists for what Signal doesn't cover: servers, channels, team collaboration,
			and identity without a phone number.
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
						<th scope="col">Signal</th>
					</tr>
				</thead>
				<tbody>
					{#each signal.features as f}
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
		<h2>Where Signal Wins</h2>
		<ul>
			{#each signal.strengths as s}
				<li>{s}</li>
			{/each}
		</ul>
		<p>
			We're not going to pretend otherwise. Signal's protocol is the most scrutinized encryption
			system in the world. Their sealed sender feature hides metadata from the server in ways
			Vex hasn't implemented yet. If your threat model is a nation-state adversary and you only
			need 1:1 messaging, Signal is the right choice.
		</p>
	</section>

	<section class="section">
		<h2>Where Vex Wins</h2>
		<ul>
			{#each vex.strengths as s}
				<li>{s}</li>
			{/each}
		</ul>
		<p>
			Signal requires your phone number. Vex requires nothing — your identity is a cryptographic
			key pair generated on your device. Signal gives you group chats. Vex gives you servers with
			channels, closer to how Discord and Slack work, but with everything encrypted.
		</p>
	</section>

	<section class="section">
		<h2>The Phone Number Problem</h2>
		<p>
			Signal ties your identity to your phone number. This is a deliberate design choice that
			makes onboarding easy — your contacts are already there. But it also means:
		</p>
		<ul>
			<li>Your real identity is linked to your account</li>
			<li>Anyone with your number can find you on Signal</li>
			<li>Anonymity requires a burner phone</li>
			<li>SIM swap attacks can compromise your account</li>
		</ul>
		<p>
			Vex uses device-bound Ed25519 key pairs. Your identity is your public key. No phone number,
			no email, no PII. You exist because math says you do.
		</p>
	</section>

	<section class="section">
		<h2>Groups and Collaboration</h2>
		<p>
			Signal groups work for family chats and small friend groups. They don't work for teams,
			communities, or organizations. There are no channels, no topics, no way to organize
			conversations. At scale, Signal groups become noise.
		</p>
		<p>
			Vex uses the same model as Discord — servers with channels. Create a server for your team,
			add channels for different topics, invite members with a link. Every message in every channel
			is end-to-end encrypted. The server sees only ciphertext.
		</p>
	</section>

	<section class="section">
		<h2>Self-Hosting</h2>
		<p>
			Signal is technically open source, but running your own Signal server means forking their
			infrastructure, losing federation with the main network, and maintaining a complex stack.
			In practice, everyone uses Signal's servers.
		</p>
		<p>
			Vex is designed for self-hosting. Single binary. SQLite or PostgreSQL. Run it on a VPS,
			a Raspberry Pi, or your closet server. When you self-host, you control not just the messages
			(which are encrypted anyway) but the metadata — who talks to whom, when, how often.
		</p>
	</section>

	<section class="section">
		<h2>What Vex Is Missing</h2>
		<p>Honesty matters. Here's what Signal has that Vex doesn't — yet:</p>
		<ul>
			<li><strong>Disappearing messages</strong> — Signal has granular timers; Vex doesn't have this yet</li>
			<li><strong>Sealed sender</strong> — Signal hides sender metadata from the server</li>
			<li><strong>User base</strong> — Signal has millions of users; Vex is new</li>
			<li><strong>Mobile-first experience</strong> — Signal's mobile app is polished; Vex is desktop-first</li>
			<li><strong>Voice and video calls</strong> — Signal supports encrypted calls; Vex is text-only for now</li>
		</ul>
	</section>

	<section class="section">
		<h2>Who Should Use What</h2>
		<div class="verdict">
			<div class="verdict-card">
				<h3>Use Signal if</h3>
				<ul>
					<li>You need private 1:1 messaging</li>
					<li>Your contacts are already on Signal</li>
					<li>You want encrypted voice/video calls</li>
					<li>Simplicity matters more than features</li>
				</ul>
			</div>
			<div class="verdict-card">
				<h3>Use Vex if</h3>
				<ul>
					<li>You need servers and channels, not just group chats</li>
					<li>You don't want to give up your phone number</li>
					<li>You want to self-host and control metadata</li>
					<li>You need a team collaboration tool, not just a messenger</li>
				</ul>
			</div>
		</div>
		<p>
			They're not competitors — they solve different problems. Use Signal for private conversations.
			Use Vex for private collaboration.
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

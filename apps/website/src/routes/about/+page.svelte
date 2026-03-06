<script>
	import { Meta } from '$lib/seo';
	import { GITHUB_ORG } from '$lib/config';
</script>

<Meta
	title="About"
	description="Vex Heavy Industries — building private communication tools. AGPL-3.0 open source."
	path="/about"
/>

<div class="about">
	<section id="about-hero" class="hero">
		<h1>About Vex</h1>
		<p class="subtitle">
			Built by Vex Heavy Industries. We believe private communication is a right, not a feature.
		</p>
	</section>

	<section id="about-team" class="section">
		<h2>Mission</h2>
		<p>
			Every major chat platform reads your messages. They analyze them, store them, and use them to
			build a profile of you and your conversations. Vex exists because we think that's wrong.
		</p>
		<p>
			We build tools where the server is structurally unable to read your messages — not by policy,
			but by cryptography. End-to-end encryption by default. Self-hostable. Open source.
		</p>

		<h2>Open Source</h2>
		<p>
			Vex is licensed under <strong>AGPL-3.0</strong>. This means anyone running a Vex server must
			publish their modifications. You can audit every line of code — the server, the clients, the
			cryptographic library.
		</p>
		<p>
			We chose AGPL specifically because it prevents closed-source forks. If someone modifies Vex,
			the community benefits.
		</p>
		<p>
			<a href="{GITHUB_ORG}/vex-chat">View the source on GitHub</a>
		</p>

		<h2>Contact</h2>
		<p>
			The best way to reach us is through
			<a href="{GITHUB_ORG}/vex-chat/issues">GitHub Issues</a>.
		</p>
	</section>
</div>

<style>
	.about {
		max-width: 720px;
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
		line-height: 1.7;
		max-width: 520px;
	}

	.section {
		padding: 2rem 0 4rem;
	}

	h2 {
		font-size: 1.4rem;
		margin: 2.5rem 0 0.75rem;
		color: var(--text-primary);
	}

	h2:first-child {
		margin-top: 0;
	}

	p {
		color: var(--text-secondary);
		line-height: 1.7;
		margin: 0 0 1rem;
	}

	a {
		color: var(--accent);
	}

	strong {
		color: var(--text-primary);
	}

	@media (max-width: 768px) {
		.about { padding: 5rem 1rem 3rem; }
		h1 { font-size: 2rem; }
	}
</style>

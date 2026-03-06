<script lang="ts">
	import { Meta, JsonLd } from '$lib/seo';
	import { GITHUB_ORG } from '$lib/config';
	import { WitchyHero, WitchyOrbs } from '$lib/visuals';
	import { getProceduralCard, getProceduralCard2, getProceduralCardHero } from '$lib/visuals';

	const TWITTER_URL = 'https://x.com/vexwtf7';

	let cardHero = $derived(getProceduralCardHero(0, '/'));
	let card = $derived(getProceduralCard(0, '/'));
	let card2 = $derived(getProceduralCard2(0, '/'));
</script>

<Meta
	title="Private Chat"
	description="End-to-end encrypted, self-hosted chat platform. A privacy-first alternative to Discord and Slack."
	path="/"
/>

<JsonLd
	schema={{
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: 'Vex',
		description: 'End-to-end encrypted, self-hosted chat platform',
		applicationCategory: 'CommunicationApplication',
		operatingSystem: 'Windows, macOS, Linux',
		license: 'https://www.gnu.org/licenses/agpl-3.0.html',
		url: 'https://vex.wtf',
		offers: { '@type': 'Offer', price: '0' },
	}}
/>

<!-- Hero -->
<section class="home-section" id="hero">
	<div class="home-columns">
		<div class="home-bg" aria-hidden="true">
			<WitchyHero roomPath="/" />
		</div>
		<div class="home-content">
			<div
				class="content-frame"
				style:--card-accent-color={cardHero.color}
				style:--card-accent-bg={cardHero.colorBg}
				style:--card-accent-glow="{cardHero.color}60"
				style:--card-accent-glow-strong="{cardHero.color}99"
			>
				<span class="card-hdr">
					<span class="card-hdr__img-wrap">
						<img src={cardHero.image} alt="" class="card-hdr__img" />
					</span>
					<span class="card-hdr__title">Private Chat For Sensitive Young Men</span>
				</span>
				<p>
					Simple privacy and powerful end to end encryption technology for communication.
					Real-time messaging with large groups of people or chatting with your friends
					without compromising your privacy.
				</p>
				<a href={TWITTER_URL} target="_blank" rel="noopener noreferrer" class="cta-btn cta-btn--primary">
					<span class="cta-led" aria-hidden="true"></span>
					Follow Us
				</a>
			</div>
		</div>
	</div>
</section>

<!-- About / Privacy -->
<section class="home-section" id="about">
	<div class="home-columns">
		<div class="home-bg" aria-hidden="true">
			<WitchyOrbs roomPath="/" slotId="home-about" section="about" />
		</div>
		<div class="home-content">
			<div
				class="content-frame"
				style:--card-accent-color={card.color}
				style:--card-accent-bg={card.colorBg}
				style:--card-accent-glow="{card.color}60"
				style:--card-accent-glow-strong="{card.color}99"
			>
				<span class="card-hdr">
					<span class="card-hdr__img-wrap">
						<img src={card.image} alt="" class="card-hdr__img" />
					</span>
					<span class="card-hdr__title">Privacy Is Not A Crime</span>
				</span>
				<p>
					Vex Chat is a secure instant messaging platform for social and commercial use.
					A private place to share ideas that protects your identity and keeps you in control.
				</p>
				<a href={TWITTER_URL} target="_blank" rel="noopener noreferrer" class="cta-btn cta-btn--primary">
					<span class="cta-led" aria-hidden="true"></span>
					Follow Us
				</a>
			</div>
		</div>
	</div>
</section>

<!-- Features / Encryption -->
<section class="home-section" id="features">
	<div class="home-columns">
		<div class="home-bg" aria-hidden="true">
			<WitchyOrbs roomPath="/" slotId="home-features" section="features" />
		</div>
		<div class="home-content">
			<div
				class="content-frame"
				style:--card-accent-color={card2.color}
				style:--card-accent-bg={card2.colorBg}
				style:--card-accent-glow="{card2.color}60"
				style:--card-accent-glow-strong="{card2.color}99"
			>
				<span class="card-hdr">
					<span class="card-hdr__img-wrap">
						<img src={card2.image} alt="" class="card-hdr__img" />
					</span>
					<span class="card-hdr__title">Encrypted By Default</span>
				</span>
				<h2>Your conversation</h2>
				<p>
					Vex is open-source, encrypted and free. It connects you securely to any other
					Vex user, anywhere in the world.
				</p>
				<h2>Free of censorship</h2>
				<p>
					Your messages are end to end encrypted, meaning we couldn't even read them
					if we wanted to.
				</p>
				<h2>No surveillance</h2>
				<p>
					We collect as little data as possible to provide you with chat service.
					We don't spy on you or collect data for profit.
				</p>
				<div class="features-ctas">
					<a href="/privacy" class="cta-btn cta-btn--outlined">
						<span class="cta-led" aria-hidden="true"></span>
						Privacy Policy
					</a>
					<a href="{GITHUB_ORG}" target="_blank" rel="noopener noreferrer" class="cta-btn cta-btn--outlined">
						<span class="cta-led" aria-hidden="true"></span>
						Read the Code
					</a>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	/* Google Fonts for the CRT/aviation aesthetic */
	@import url('https://fonts.googleapis.com/css2?family=B612+Mono:wght@400;700&family=DM+Sans:wght@400;500;600;700&display=swap');

	/* Section layout: each section = full viewport height */
	.home-section {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		padding: 2rem 1rem;
	}

	/* 50/50 split columns */
	.home-columns {
		flex: 1;
		min-height: 0;
		display: flex;
		align-items: stretch;
	}
	.home-bg {
		flex: 1 1 50%;
		min-width: 0;
		min-height: 0;
		display: flex;
		align-items: stretch;
		position: relative;
	}
	.home-content {
		flex: 1 1 50%;
		min-width: 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: flex-start;
	}

	/* CRT content frame */
	.content-frame {
		background: #0a0a0c;
		padding: 1.5rem;
		border-radius: 12px;
		border: 2px solid rgba(80, 82, 90, 0.3);
		box-shadow:
			inset 0 0 0 1px rgba(0, 0, 0, 0.6),
			inset 0 0 120px 40px rgba(0, 0, 0, 0.4),
			inset 0 0 0 1px rgba(231, 0, 0, 0.06),
			0 1px 0 rgba(0, 0, 0, 0.5),
			0 0 0 4px rgba(0, 0, 0, 0.8);
		width: 100%;
		max-width: 42rem;
		position: relative;
		overflow: hidden;
		animation: crt-flicker 8s ease-in-out infinite;
	}
	/* CRT curved glass tint */
	.content-frame::before {
		content: "";
		position: absolute;
		inset: 0;
		background:
			radial-gradient(ellipse 90% 90% at 50% 50%, transparent 30%, rgba(0, 0, 0, 0.15) 80%, rgba(0, 0, 0, 0.3) 100%),
			linear-gradient(180deg, rgba(231, 0, 0, 0.02) 0%, transparent 50%, rgba(0, 0, 0, 0.05) 100%);
		pointer-events: none;
		border-radius: inherit;
	}

	@keyframes crt-flicker {
		0%, 88%, 90%, 92%, 94%, 96%, 98%, 100% { opacity: 1; }
		89% { opacity: 0.96; }
		91% { opacity: 0.98; }
		93% { opacity: 0.97; }
		95% { opacity: 0.99; }
		97% { opacity: 0.98; }
	}

	/* Card header */
	.card-hdr {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
		width: 100%;
	}
	.card-hdr__img-wrap {
		flex-shrink: 0;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		overflow: hidden;
		border: 2px solid #0a0a0a;
		box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.5), 0 0 16px var(--card-accent-glow), 0 0 8px var(--card-accent-glow);
	}
	.card-hdr__img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.card-hdr__title {
		flex: 1;
		min-width: 0;
		font-family: 'B612 Mono', 'Consolas', monospace;
		font-size: 0.9rem;
		font-weight: 400;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--card-accent-color);
		text-shadow: 0 0 12px var(--card-accent-glow), 0 0 4px var(--card-accent-glow-strong);
		overflow-wrap: break-word;
		word-break: break-word;
		position: relative;
	}
	/* CRT scanlines on title */
	.card-hdr__title::after {
		content: "";
		position: absolute;
		inset: 0;
		background: repeating-linear-gradient(0deg, transparent 0px, transparent 1px, rgba(0, 0, 0, 0.35) 1px, rgba(0, 0, 0, 0.35) 2px);
		opacity: 0.9;
		pointer-events: none;
	}

	/* Text styles — procedural accent coloring */
	h2 {
		font-family: 'B612 Mono', 'Consolas', monospace;
		color: var(--card-accent-color);
		font-weight: 600;
		font-size: 1rem;
		letter-spacing: 0.05em;
		margin: 1.25rem 0 0.5rem;
		position: relative;
	}
	h2::after {
		content: "";
		position: absolute;
		inset: 0;
		background: repeating-linear-gradient(0deg, transparent 0px, transparent 1px, rgba(0, 0, 0, 0.35) 1px, rgba(0, 0, 0, 0.35) 2px);
		opacity: 0.9;
		pointer-events: none;
	}
	p {
		color: var(--card-accent-color);
		font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
		font-weight: 500;
		font-size: 0.9rem;
		line-height: 1.5;
		letter-spacing: 0.01em;
		margin: 0 0 1rem;
		max-width: 100%;
		overflow-wrap: break-word;
	}

	/* CTA buttons — crystal cube with LED orb */
	.cta-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.6rem 1.25rem 0.6rem 1.85em;
		font-family: 'B612 Mono', 'Consolas', monospace;
		font-size: 0.9rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		text-decoration: none;
		border-radius: 3px;
		min-height: 44px;
		position: relative;
		overflow: hidden;
		transition: box-shadow 0.25s ease, color 0.25s ease, border-color 0.25s ease;
		margin: 0.5rem 0;
	}
	.cta-led {
		position: absolute;
		left: 0.6em;
		top: 50%;
		transform: translateY(-50%);
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 35%, rgba(255, 120, 100, 1), #e70000 45%, rgba(140, 0, 0, 0.95) 100%);
		box-shadow: inset 1px 1px 2px rgba(255, 180, 160, 0.4), inset -1px -1px 2px rgba(0, 0, 0, 0.3), 0 0 8px rgba(231, 0, 0, 0.6), 0 0 12px rgba(231, 0, 0, 0.35);
		transition: background 0.25s, box-shadow 0.25s;
	}
	.cta-btn::after {
		content: "";
		position: absolute;
		inset: 0;
		border-radius: inherit;
		pointer-events: none;
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 40%, rgba(0, 0, 0, 0.1) 100%);
	}

	/* Primary filled */
	.cta-btn--primary {
		color: #fff;
		background: linear-gradient(145deg, var(--card-accent-color) 0%, var(--card-accent-bg) 100%);
		border: 1px solid var(--card-accent-color);
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08), 0 0 12px var(--card-accent-glow), 0 0 20px var(--card-accent-glow);
	}
	.cta-btn--primary:hover {
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1), 0 0 16px var(--card-accent-glow), 0 0 24px var(--card-accent-glow-strong);
	}

	/* Outlined */
	.cta-btn--outlined {
		background: linear-gradient(145deg, rgba(28, 30, 35, 0.5) 0%, rgba(18, 20, 24, 0.7) 100%);
		border: 1px solid var(--card-accent-color);
		color: var(--card-accent-color);
		text-shadow: 0 0 6px var(--card-accent-glow);
	}
	.cta-btn--outlined:hover {
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06), 0 0 16px var(--card-accent-glow), 0 0 24px var(--card-accent-glow-strong);
	}
	.cta-btn--outlined:hover .cta-led {
		background: radial-gradient(circle at 35% 35%, var(--card-accent-color), var(--card-accent-bg) 45%, var(--card-accent-bg) 100%);
		box-shadow: inset 1px 1px 2px rgba(255, 255, 255, 0.3), inset -1px -1px 2px rgba(0, 0, 0, 0.2), 0 0 10px var(--card-accent-glow), 0 0 18px var(--card-accent-glow-strong);
	}

	/* Features section CTAs */
	.features-ctas {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-top: 0.5rem;
	}
	.features-ctas .cta-btn {
		padding: 0.4rem 0.75rem 0.4rem 1.6em;
		font-size: 0.75rem;
		min-height: 36px;
	}
	.features-ctas .cta-led {
		width: 6px;
		height: 6px;
		left: 0.5em;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.content-frame { animation: none; }
	}

	/* Mobile: stack instead of 50/50 */
	@media (max-width: 768px) {
		.home-columns {
			flex-direction: column;
		}
		.home-bg {
			min-height: 40vh;
		}
		.home-content {
			padding: 1rem 0;
		}
		.content-frame {
			max-width: 100%;
		}
	}
</style>

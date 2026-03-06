<script>
	import { Meta, JsonLd } from '$lib/seo';
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

<main>
	<h1>Vex</h1>
	<p>Privacy is not a crime.</p>
</main>

<script>
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Vex</title>
	<meta name="description" content="End-to-end encrypted, self-hosted chat platform. A privacy-first alternative to Discord and Slack." />
</svelte:head>

{@render children()}

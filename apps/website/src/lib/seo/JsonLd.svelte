<script lang="ts">
	interface Props {
		schema: Record<string, unknown>;
	}

	let { schema }: Props = $props();
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify(schema)}</script>`}
</svelte:head>

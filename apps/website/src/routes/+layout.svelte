<script>
	import '../app.css';
	import { Navigator } from '$lib/navigation';
	import { page } from '$app/state';

	let { children } = $props();

	// Invite route doesn't use the navigation system
	let useNavigator = $derived(!page.url.pathname.startsWith('/invite'));
</script>

{#if useNavigator}
	<Navigator>
		{@render children()}
	</Navigator>
{:else}
	{@render children()}
{/if}

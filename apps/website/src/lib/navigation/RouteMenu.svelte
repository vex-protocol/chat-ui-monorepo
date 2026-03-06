<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { LATERAL_ROUTES, routeIndex, pathForIndex } from './routes';

	let currentIdx = $derived(routeIndex(page.url.pathname));

	function goTo(i: number) {
		if (i === currentIdx) {
			window.scrollTo({ top: 0, behavior: 'smooth' });
		} else {
			goto(pathForIndex(i));
		}
	}
</script>

<nav class="route-menu" role="tablist" aria-label="Page navigation">
	{#each LATERAL_ROUTES as route, i}
		<button
			type="button"
			role="tab"
			aria-selected={i === currentIdx}
			aria-label="Go to {route.label}"
			class="route-menu__item"
			class:active={i === currentIdx}
			onclick={() => goTo(i)}
		>
			{route.label}
		</button>
	{/each}
</nav>

<style>
	.route-menu {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 200;
		display: flex;
		justify-content: center;
		gap: 0.25rem;
		padding: 1rem;
		background: linear-gradient(to bottom, var(--bg-primary) 60%, transparent);
		pointer-events: none;
	}

	.route-menu__item {
		pointer-events: auto;
		background: none;
		border: 1px solid transparent;
		border-radius: 6px;
		color: var(--text-muted);
		font-size: 0.8rem;
		padding: 0.4rem 0.75rem;
		cursor: pointer;
		transition: color 0.2s, border-color 0.2s;
	}

	.route-menu__item:hover {
		color: var(--text-primary);
	}

	.route-menu__item.active {
		color: var(--text-primary);
		border-color: var(--border);
	}
</style>

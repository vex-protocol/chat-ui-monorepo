<script lang="ts">
	import { LATERAL_ROUTES } from './routes';

	interface Props {
		lateralIndex: number;
		sectionIds: readonly string[];
		shake?: boolean;
		attemptDirection?: 'left' | 'right' | 'up' | 'down' | null;
		onNavigate: (dir: 'left' | 'right' | 'up' | 'down') => void;
	}

	let {
		lateralIndex,
		sectionIds,
		shake = false,
		attemptDirection = null,
		onNavigate,
	}: Props = $props();

	let verticalIndex = $state(0);

	function updateVerticalIndex() {
		if (sectionIds.length === 0) return;
		const scrollY = window.scrollY;
		const viewH = window.innerHeight;
		let index = 0;
		for (let i = 0; i < sectionIds.length; i++) {
			const el = document.getElementById(sectionIds[i]);
			if (!el) continue;
			if (scrollY < el.offsetTop + viewH / 2) {
				index = i;
				break;
			}
			index = i;
		}
		verticalIndex = index;
	}

	$effect(() => {
		// Re-run when sectionIds changes
		sectionIds;
		updateVerticalIndex();
		window.addEventListener('scroll', updateVerticalIndex, { passive: true });
		window.addEventListener('resize', updateVerticalIndex);
		return () => {
			window.removeEventListener('scroll', updateVerticalIndex);
			window.removeEventListener('resize', updateVerticalIndex);
		};
	});

	let hasNorth = $derived(verticalIndex > 0);
	let hasSouth = $derived(verticalIndex < sectionIds.length - 1);
	let hasWest = $derived(lateralIndex > 0);
	let hasEast = $derived(lateralIndex < LATERAL_ROUTES.length - 1);
</script>

<div
	class="gauge"
	class:shake
	role="group"
	aria-label="Position gauge"
>
	<div class="cross">
		<!-- North -->
		<div class="arm arm-n" class:flicker={attemptDirection === 'up'}>
			<button
				type="button"
				class="dot"
				class:available={hasNorth}
				disabled={!hasNorth}
				aria-label="Previous section (↑)"
				onclick={() => onNavigate('up')}
			><span class="dot-inner" /></button>
		</div>

		<!-- West -->
		<div class="arm arm-w" class:flicker={attemptDirection === 'left'}>
			<button
				type="button"
				class="dot"
				class:available={hasWest}
				disabled={!hasWest}
				aria-label="Previous route (←)"
				onclick={() => onNavigate('left')}
			><span class="dot-inner" /></button>
		</div>

		<!-- Center -->
		<div class="arm arm-c">
			<div class="dot center" role="img" aria-label="Position {lateralIndex + 1}, {verticalIndex + 1}">
				<span class="reticle-h" />
				<span class="reticle-v" />
				<span class="reticle-dot" />
				<span class="reticle-ring" />
			</div>
		</div>

		<!-- East -->
		<div class="arm arm-e" class:flicker={attemptDirection === 'right'}>
			<button
				type="button"
				class="dot"
				class:available={hasEast}
				disabled={!hasEast}
				aria-label="Next route (→)"
				onclick={() => onNavigate('right')}
			><span class="dot-inner" /></button>
		</div>

		<!-- South -->
		<div class="arm arm-s" class:flicker={attemptDirection === 'down'}>
			<button
				type="button"
				class="dot"
				class:available={hasSouth}
				disabled={!hasSouth}
				aria-label="Next section (↓)"
				onclick={() => onNavigate('down')}
			><span class="dot-inner" /></button>
		</div>
	</div>

	<div class="coords" aria-hidden="true">
		({lateralIndex + 1}, {verticalIndex + 1})
	</div>
</div>

<style>
	.gauge {
		user-select: none;
	}

	.gauge.shake {
		animation: shake 0.3s ease-in-out;
	}

	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		25% { transform: translateX(-3px); }
		75% { transform: translateX(3px); }
	}

	.cross {
		display: grid;
		grid-template-areas:
			".    n    ."
			"w    c    e"
			".    s    .";
		grid-template-columns: 24px 24px 24px;
		grid-template-rows: 24px 24px 24px;
		gap: 2px;
	}

	.arm-n { grid-area: n; }
	.arm-s { grid-area: s; }
	.arm-w { grid-area: w; }
	.arm-e { grid-area: e; }
	.arm-c { grid-area: c; }

	.arm.flicker {
		animation: flicker 0.3s ease-in-out;
	}

	@keyframes flicker {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.3; }
	}

	.dot {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		border: 1px solid var(--border);
		background: var(--bg-tertiary);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: default;
		padding: 0;
		transition: border-color 0.2s, background 0.2s;
	}

	.dot.available {
		cursor: pointer;
		border-color: var(--text-muted);
	}

	.dot.available:hover {
		border-color: var(--accent);
		background: var(--bg-secondary);
	}

	.dot:disabled {
		opacity: 0.3;
	}

	.dot-inner {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--text-muted);
	}

	.dot.available .dot-inner {
		background: var(--text-primary);
	}

	/* Center reticle */
	.center {
		position: relative;
		border-color: var(--accent);
		background: var(--bg-primary);
	}

	.reticle-h, .reticle-v {
		position: absolute;
		background: var(--accent);
	}

	.reticle-h {
		width: 12px;
		height: 1px;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	.reticle-v {
		width: 1px;
		height: 12px;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	.reticle-dot {
		position: absolute;
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: var(--accent);
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	.reticle-ring {
		position: absolute;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		border: 1px solid var(--accent);
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		opacity: 0.4;
	}

	.coords {
		text-align: center;
		font-size: 0.65rem;
		color: #8e8e96;
		margin-top: 4px;
		font-family: monospace;
	}
</style>

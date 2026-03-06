<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { LATERAL_ROUTES, routeIndex, pathForIndex } from './routes';
	import RouteMenu from './RouteMenu.svelte';
	import PositionGauge from './PositionGauge.svelte';

	let { children } = $props();

	// --- State ---
	let currentRouteIdx = $derived(routeIndex(page.url.pathname));
	let sectionIds = $derived(LATERAL_ROUTES[currentRouteIdx]?.sectionIds ?? []);
	let shake = $state(false);
	let attemptDirection: 'left' | 'right' | 'up' | 'down' | null = $state(null);

	// Non-reactive mutable state (no $state — these don't need to trigger rerenders)
	let wheelAccum = { x: 0, y: 0 };
	let lastWheelTime = 0;
	let wheelLockoutUntil = 0;
	let touchStartPos: { x: number; y: number } | null = null;

	// --- Helpers ---
	function getCurrentSectionIndex(): number {
		if (sectionIds.length === 0) return 0;
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
		return index;
	}

	function shakeAt(dir: 'left' | 'right' | 'up' | 'down') {
		attemptDirection = dir;
		shake = true;
		setTimeout(() => {
			shake = false;
			attemptDirection = null;
		}, 400);
	}

	// --- Navigation ---
	function goRoute(delta: number) {
		const next = currentRouteIdx + delta;
		if (next < 0 || next >= LATERAL_ROUTES.length) {
			shakeAt(delta < 0 ? 'left' : 'right');
			return;
		}
		goto(pathForIndex(next));
	}

	function goSection(delta: number) {
		if (sectionIds.length === 0) return;
		const current = getCurrentSectionIndex();
		const next = current + delta;
		if (next < 0 || next >= sectionIds.length) {
			shakeAt(delta < 0 ? 'up' : 'down');
			return;
		}
		const el = document.getElementById(sectionIds[next]);
		el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	type NavDir = 'up' | 'down' | 'left' | 'right';
	function navigate(dir: NavDir) {
		if (dir === 'left' || dir === 'right') {
			goRoute(dir === 'left' ? -1 : 1);
		} else {
			goSection(dir === 'down' ? 1 : -1);
		}
	}

	// --- Keyboard ---
	function onKeydown(e: KeyboardEvent) {
		const target = e.target as HTMLElement;
		if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
			return;

		if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowUp') {
			e.preventDefault();
			window.scrollTo({ top: 0, behavior: 'smooth' });
			return;
		}

		const dirMap: Record<string, NavDir> = {
			ArrowLeft: 'left',
			ArrowRight: 'right',
			ArrowUp: 'up',
			ArrowDown: 'down',
		};
		const dir = dirMap[e.key];
		if (dir) {
			e.preventDefault();
			navigate(dir);
		}
	}

	// --- Wheel ---
	function onWheel(e: WheelEvent) {
		const target = e.target as HTMLElement;
		if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
			return;

		const THRESHOLD = 120;
		const LOCKOUT_MS = 700;
		const IDLE_RESET_MS = 150;
		const now = Date.now();

		if (now < wheelLockoutUntil) {
			e.preventDefault();
			return;
		}
		if (now - lastWheelTime > IDLE_RESET_MS) {
			wheelAccum = { x: 0, y: 0 };
		}
		lastWheelTime = now;

		const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 80 : 1;
		const dx = e.deltaX * scale;
		const dy = e.deltaY * scale;
		const isHorizontal = Math.abs(dx) > Math.abs(dy);
		const delta = isHorizontal ? dx : dy;
		const sign = delta > 0 ? 1 : -1;
		const axis = isHorizontal ? 'x' : 'y';

		e.preventDefault();
		if ((wheelAccum[axis] > 0) !== (sign > 0)) wheelAccum[axis] = 0;
		wheelAccum[axis] += delta;

		if (Math.abs(wheelAccum[axis]) >= THRESHOLD) {
			wheelAccum[axis] = 0;
			wheelLockoutUntil = now + LOCKOUT_MS;
			navigate(isHorizontal ? (sign > 0 ? 'right' : 'left') : sign > 0 ? 'down' : 'up');
		}
	}

	// --- Touch ---
	function onTouchStart(e: TouchEvent) {
		touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
	}

	function onTouchEnd(e: TouchEvent) {
		if (!touchStartPos) return;
		const dx = e.changedTouches[0].clientX - touchStartPos.x;
		const dy = e.changedTouches[0].clientY - touchStartPos.y;
		touchStartPos = null;
		const threshold = 50;
		const absDx = Math.abs(dx);
		const absDy = Math.abs(dy);

		if (absDx > absDy && absDx > threshold) {
			navigate(dx > 0 ? 'left' : 'right');
			return;
		}
		if (absDy > absDx && absDy > threshold) {
			navigate(dy < 0 ? 'down' : 'up');
		}
	}
</script>

<svelte:window
	onkeydown={onKeydown}
	onwheel|nonpassive={onWheel}
	ontouchstart={onTouchStart}
	ontouchend={onTouchEnd}
/>

<div class="app-navigator">
	<RouteMenu />

	<div class="nav-gauge">
		<PositionGauge
			lateralIndex={currentRouteIdx}
			{sectionIds}
			{shake}
			{attemptDirection}
			onNavigate={navigate}
		/>
	</div>

	<main>
		{@render children()}
	</main>
</div>

<style>
	.app-navigator {
		position: relative;
		min-height: 100vh;
	}

	.nav-gauge {
		position: fixed;
		bottom: 2rem;
		right: 2rem;
		z-index: 100;
	}

	main {
		width: 100%;
	}

	@media (max-width: 768px) {
		.nav-gauge {
			bottom: 1rem;
			right: 1rem;
		}
	}
</style>

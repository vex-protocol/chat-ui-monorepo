<!--
	WitchyOrbs — orbs with images, twinkling stars, spacecraft flying between planets.
	Ported from React WitchyOrbs component.
-->
<script lang="ts">
	import { page } from '$app/state';
	import { generateOrbs, type Orb, type OrbColor } from './orb-images';
	import { useIsMobile } from './use-is-mobile.svelte';

	type WitchyOrbsSection = 'about' | 'features';

	interface Props {
		section: WitchyOrbsSection;
		slotId: string;
		roomPath?: string;
	}
	let { section, slotId, roomPath = '/' }: Props = $props();

	const isMobile = useIsMobile();

	const ORB_COUNT = 6;
	const ORB_COUNT_MOBILE = 3;
	const STAR_COUNT = 20;
	const STAR_COUNT_MOBILE = 8;
	const SPACECRAFT_DURATION = 6;
	const EXPLOSION_PARTICLE_COUNT = 8;

	const ORB_LAYOUTS: Record<
		WitchyOrbsSection,
		{
			positions: [string, string][];
			sizes: string[];
			coords: [number, number][];
			positionsMobile: [string, string][];
			sizesMobile: string[];
			coordsMobile: [number, number][];
		}
	> = {
		about: {
			positions: [['8%','18%'],['72%','48%'],['28%','78%'],['68%','22%'],['85%','62%'],['12%','58%']],
			sizes: ['witchy-orb--lg','witchy-orb--md','witchy-orb--sm','witchy-orb--md','witchy-orb--sm','witchy-orb--md'],
			coords: [[8,18],[72,48],[28,78],[68,22],[85,62],[12,58]],
			positionsMobile: [['18%','28%'],['78%','52%'],['45%','85%']],
			sizesMobile: ['witchy-orb--md','witchy-orb--lg','witchy-orb--sm'],
			coordsMobile: [[18,28],[78,52],[45,85]],
		},
		features: {
			positions: [['15%','22%'],['75%','55%'],['35%','72%'],['60%','18%'],['82%','38%'],['5%','68%']],
			sizes: ['witchy-orb--md','witchy-orb--sm','witchy-orb--lg','witchy-orb--sm','witchy-orb--md','witchy-orb--sm'],
			coords: [[15,22],[75,55],[35,72],[60,18],[82,38],[5,68]],
			positionsMobile: [['22%','32%'],['72%','58%'],['38%','88%']],
			sizesMobile: ['witchy-orb--sm','witchy-orb--md','witchy-orb--md'],
			coordsMobile: [[22,32],[72,58],[38,88]],
		},
	};

	const SPACECRAFT_ROUTES: [number, number][] = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]];
	const SPACECRAFT_ROUTES_MOBILE: [number, number][] = [[0,1],[1,2],[2,0]];

	const COLOR_TO_MODIFIER: Record<OrbColor, string> = {
		red: '', purple: 'witchy-orb--purple', green: 'witchy-orb--green',
		blue: 'witchy-orb--blue', pink: 'witchy-orb--pink', cream: 'witchy-orb--cream',
		rainbow: 'witchy-orb--rainbow',
	};

	const COLOR_HEX: Record<OrbColor, string> = {
		red: '#e70000', purple: '#2a075b', green: '#91e643',
		blue: '#a8c8df', pink: '#c5698b', cream: '#d9c2a3', rainbow: '#c5698b',
	};

	let filterId = `witchy-spacecraft-glow-${Math.random().toString(36).slice(2, 8)}`;

	let layout = $derived(ORB_LAYOUTS[section]);
	let orbCount = $derived(isMobile.value ? ORB_COUNT_MOBILE : ORB_COUNT);
	let positions = $derived(isMobile.value ? layout.positionsMobile : layout.positions);
	let sizes = $derived(isMobile.value ? layout.sizesMobile : layout.sizes);
	let orbCoords = $derived(isMobile.value ? layout.coordsMobile : layout.coords);
	let spacecraftRoutes = $derived(isMobile.value ? SPACECRAFT_ROUTES_MOBILE : SPACECRAFT_ROUTES);
	let starCount = $derived(isMobile.value ? STAR_COUNT_MOBILE : STAR_COUNT);

	let orbs = $derived(generateOrbs(orbCount, slotId, roomPath));
	let orbsWithImages = $derived(
		orbs.map((orb, i) => ({ ...orb, originalIndex: i })).filter((o) => o.image)
	);
	let validRoutes = $derived(
		spacecraftRoutes.filter(([a, b]) => orbs[a]?.image && orbs[b]?.image)
	);
	let stars = $derived(
		Array.from({ length: starCount }, (_, i) => ({
			id: i,
			left: `${(i * 13 + 7) % 100}%`,
			top: `${(i * 17 + 11) % 100}%`,
			delay: `${(i % 6) * 0.5}s`,
			duration: `${6 + (i % 4)}s`,
		}))
	);
</script>

<div class="witchy-container witchy-container--orbs">
	{#each stars as s (s.id)}
		<div
			class="witchy-star"
			style:left={s.left}
			style:top={s.top}
			style:animation-delay={s.delay}
			style:animation-duration={s.duration}
			aria-hidden="true"
		></div>
	{/each}

	<svg class="witchy-network" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
		<defs>
			<filter id={filterId} x="-100%" y="-100%" width="300%" height="300%">
				<feGaussianBlur stdDeviation="0.2" result="blur" />
				<feMerge>
					<feMergeNode in="blur" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>
		</defs>
		{#each validRoutes as [a, b], idx}
			{@const x1 = orbCoords[a][0]}
			{@const y1 = orbCoords[a][1]}
			{@const x2 = orbCoords[b][0]}
			{@const y2 = orbCoords[b][1]}
			{@const pathD = `M ${x1} ${y1} L ${x2} ${y2}`}
			{@const originColor = orbs[a]?.color ?? 'red'}
			{@const destColor = orbs[b]?.color ?? 'red'}
			{@const begin = idx * SPACECRAFT_DURATION}
			<g>
				<circle
					class="witchy-spacecraft"
					r="0.9"
					fill={COLOR_HEX[originColor]}
					filter="url(#{filterId})"
					style:animation-delay="{begin}s"
				>
					<animateMotion
						dur="{SPACECRAFT_DURATION}s"
						repeatCount="indefinite"
						path={pathD}
						begin="{begin}s"
					/>
				</circle>
				<g
					transform="translate({x2}, {y2})"
					class="witchy-spacecraft-explosion"
					style:animation-delay="{begin + SPACECRAFT_DURATION - 0.25}s"
					style:animation-duration="{SPACECRAFT_DURATION}s"
				>
					{#each Array.from({ length: EXPLOSION_PARTICLE_COUNT }) as _, i}
						<g transform="rotate({(i * 360) / EXPLOSION_PARTICLE_COUNT})">
							<circle
								class="witchy-spacecraft-explosion__particle"
								r="0.4"
								fill={COLOR_HEX[destColor]}
							/>
						</g>
					{/each}
				</g>
			</g>
		{/each}
	</svg>

	<div class="witchy-mist" aria-hidden="true"></div>

	{#each orbsWithImages as orb, i (orb.color + '-' + i + '-' + orb.image)}
		{@const [left, top] = positions[orb.originalIndex]}
		{@const modifier = COLOR_TO_MODIFIER[orb.color]}
		{@const sizeClass = sizes[orb.originalIndex] ?? 'witchy-orb--sm'}
		<div
			class="witchy-orb witchy-orb--with-image {sizeClass} {modifier}"
			style:top={top}
			style:left={left}
			aria-hidden="true"
		>
			<div class="witchy-orb__inner">
				<img src={orb.image} alt="" class="witchy-orb__img" width="440" height="440" loading="lazy" decoding="async" />
			</div>
			<div class="witchy-orb__particles" aria-hidden="true">
				<span class="witchy-orb__particle"></span>
				<span class="witchy-orb__particle"></span>
				<span class="witchy-orb__particle"></span>
			</div>
		</div>
	{/each}
</div>

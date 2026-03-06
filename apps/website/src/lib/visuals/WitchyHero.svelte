<!--
	WitchyHero — hero section with floating orbs, mascot crystal ball, twinkling stars.
	Ported from React WitchyHero component.
-->
<script lang="ts">
	import { generateOrbs, type OrbColor } from './orb-images';
	import { getProceduralMascot } from './procedural-images';
	import { useIsMobile } from './use-is-mobile.svelte';

	interface Props {
		roomPath?: string;
	}
	let { roomPath = '/' }: Props = $props();

	const isMobile = useIsMobile();

	const STAR_COUNT = 24;
	const STAR_COUNT_MOBILE = 10;
	const ORB_COUNT = 4;
	const ORB_COUNT_MOBILE = 2;

	const ORB_POSITIONS: [string, string][] = [['15%','20%'],['60%','60%'],['30%','70%'],['70%','25%']];
	const ORB_POSITIONS_MOBILE: [string, string][] = [['18%','22%'],['72%','68%']];
	const ORB_SIZES = ['witchy-orb--lg','witchy-orb--md','witchy-orb--sm','witchy-orb--sm'];
	const ORB_SIZES_MOBILE = ['witchy-orb--md','witchy-orb--md'];

	const COLOR_TO_MODIFIER: Record<OrbColor, string> = {
		red: '', purple: 'witchy-orb--purple', green: 'witchy-orb--green',
		blue: 'witchy-orb--blue', pink: 'witchy-orb--pink', cream: 'witchy-orb--cream',
		rainbow: 'witchy-orb--rainbow',
	};

	let orbCount = $derived(isMobile.value ? ORB_COUNT_MOBILE : ORB_COUNT);
	let positions = $derived(isMobile.value ? ORB_POSITIONS_MOBILE : ORB_POSITIONS);
	let sizes = $derived(isMobile.value ? ORB_SIZES_MOBILE : ORB_SIZES);
	let starCount = $derived(isMobile.value ? STAR_COUNT_MOBILE : STAR_COUNT);

	let orbs = $derived(generateOrbs(orbCount, 'home-hero', roomPath));
	let orbsWithImages = $derived(
		orbs.map((orb, i) => ({ ...orb, originalIndex: i })).filter((o) => o.image)
	);
	let mascot = $derived(getProceduralMascot(0, roomPath));
	let stars = $derived(
		Array.from({ length: starCount }, (_, i) => ({
			id: i,
			left: `${(i * 7 + 3) % 100}%`,
			top: `${(i * 11 + 5) % 100}%`,
			delay: `${(i % 6) * 0.6}s`,
			duration: `${7 + (i % 4)}s`,
		}))
	);
</script>

<div class="witchy-container">
	<div class="witchy-mist" aria-hidden="true"></div>

	{#each orbsWithImages as orb, i (orb.color + '-' + i + '-' + orb.image)}
		{@const [left, top] = positions[orb.originalIndex]}
		{@const modifier = COLOR_TO_MODIFIER[orb.color]}
		<div
			class="witchy-orb witchy-orb--with-image {sizes[orb.originalIndex]} {modifier}"
			style:top={top}
			style:left={left}
			aria-hidden="true"
		>
			<div class="witchy-orb__inner">
				<img src={orb.image} alt="" class="witchy-orb__img" />
			</div>
			<div class="witchy-orb__particles" aria-hidden="true">
				<span class="witchy-orb__particle"></span>
				<span class="witchy-orb__particle"></span>
				<span class="witchy-orb__particle"></span>
			</div>
		</div>
	{/each}

	<div class="mascot-witchy-orb mascot-witchy-orb--float" style="top: 32%; left: 6%;" aria-hidden="true">
		<div class="mascot-witchy-orb__orb" aria-hidden="true"></div>
		<div class="mascot-witchy-orb__inner">
			<img src={mascot} alt="" class="hero-mascot" loading="eager" decoding="async" />
		</div>
		<div class="mascot-witchy-orb__particles" aria-hidden="true">
			<span class="mascot-witchy-orb__particle"></span>
			<span class="mascot-witchy-orb__particle"></span>
			<span class="mascot-witchy-orb__particle"></span>
		</div>
	</div>

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
</div>

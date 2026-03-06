/**
 * Procedural orb generation — ported from vex-website.
 * Images served from /orbs/ static directory. Color folders map to orb colors.
 * Each image used at most once per playthrough (no duplicates).
 * Rainbow orbs fallback to any unused image if pool exhausted.
 */

export type OrbColor =
	| 'red'
	| 'purple'
	| 'green'
	| 'blue'
	| 'pink'
	| 'cream'
	| 'rainbow';

/** Static manifest of orb images per color folder (served from /orbs/) */
const ORB_IMAGES_BY_COLOR: Record<OrbColor, string[]> = {
	red: [
		'/orbs/FIRERED/REDGIRL.jpeg',
		'/orbs/FIRERED/SCHIZO_FREQ.jpg',
		'/orbs/FIRERED/U8x6wLlD_400x400 (1).jpg',
		'/orbs/FIRERED/basedmilio.jpg',
		'/orbs/FIRERED/basedmilio4.jpeg',
		'/orbs/FIRERED/basedmilio5.png',
		'/orbs/FIRERED/basedmilio6.png',
		'/orbs/FIRERED/bbbb.jpeg',
		'/orbs/FIRERED/fire-red.jpg',
		'/orbs/FIRERED/incinerator-red.jpg',
		'/orbs/FIRERED/kabuto.jpeg',
		'/orbs/FIRERED/plane.jpg',
	],
	purple: [
		'/orbs/ROYALPURPLE/BLACKHOLE.jpg',
		'/orbs/ROYALPURPLE/Destroyed Cassette.jpg',
		'/orbs/ROYALPURPLE/Pseudonyms.jpg',
		'/orbs/ROYALPURPLE/Shadow Tape Woman.png',
		'/orbs/ROYALPURPLE/Shadow Woman.png',
		'/orbs/ROYALPURPLE/Shadow-Tape-Woman.png',
		'/orbs/ROYALPURPLE/Shadow.jpg',
		'/orbs/ROYALPURPLE/ShadowWoman.png',
		'/orbs/ROYALPURPLE/royal-purple.jpg',
	],
	green: [
		'/orbs/INCINERATORGREEN/Destroyed Tape 2.png',
		'/orbs/INCINERATORGREEN/Poetry.jpg',
		'/orbs/INCINERATORGREEN/Zippo.png',
		'/orbs/INCINERATORGREEN/sword.png',
	],
	blue: [
		'/orbs/ICEBLUE/G7tHMybaIAATKkW.jpeg',
		'/orbs/ICEBLUE/SAYUKIXBT.jpg',
		'/orbs/ICEBLUE/channels4_profile.jpg',
	],
	pink: [
		'/orbs/PEACHPINK/Manifesto.jpg',
		'/orbs/PEACHPINK/ivy-transparent.png',
		'/orbs/PEACHPINK/lollipop-transparent.png',
		'/orbs/PEACHPINK/peach.png',
		'/orbs/PEACHPINK/yuki-transparent.png',
	],
	cream: [
		'/orbs/CREAM/gaew1.png',
		'/orbs/CREAM/gaew2.png',
		'/orbs/CREAM/sexy-removebg-preview.png',
		'/orbs/CREAM/yuki-transparent.png',
	],
	rainbow: [
		'/orbs/RAINBOW/PhuketRainbow.png',
		'/orbs/RAINBOW/e44bed2911c684822460870e22f653f5.jpg',
		'/orbs/RAINBOW/mog-coin.jpeg',
	],
};

export { ORB_IMAGES_BY_COLOR };

const COLOR_CHANCES: [OrbColor, number][] = [
	['red', 0.5],
	['purple', 0.3],
	['green', 0.05],
	['blue', 0.05],
	['pink', 0.05],
	['cream', 0.05],
];

const COLOR_RATIOS: Record<OrbColor, number> = {
	red: 0.5,
	purple: 0.3,
	green: 0.05,
	blue: 0.05,
	pink: 0.05,
	cream: 0.05,
	rainbow: 0.5,
};

const ROOM_CONFIG: Record<
	string,
	{ total: number; slots: { id: string; start: number; count: number }[] }
> = {
	'/': {
		total: 22,
		slots: [
			{ id: 'home-hero', start: 0, count: 4 },
			{ id: 'home-about', start: 4, count: 6 },
			{ id: 'home-features', start: 10, count: 6 },
			{ id: 'contact', start: 16, count: 6 },
		],
	},
	'/download': {
		total: 12,
		slots: [
			{ id: 'download-hero', start: 0, count: 6 },
			{ id: 'download-releases', start: 6, count: 6 },
		],
	},
	'/security': {
		total: 18,
		slots: [
			{ id: 'security-hero', start: 0, count: 6 },
			{ id: 'security-model', start: 6, count: 6 },
			{ id: 'security-comparison', start: 12, count: 6 },
		],
	},
	'/about': {
		total: 12,
		slots: [
			{ id: 'about-hero', start: 0, count: 6 },
			{ id: 'about-team', start: 6, count: 6 },
		],
	},
};

function mulberry32(seed: number): () => number {
	return () => {
		seed |= 0;
		let t = (seed += 0x6d2b79f5);
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function getSeed(): number {
	const ts = Date.now();
	const buf = new Uint8Array(4);
	if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
		crypto.getRandomValues(buf);
	}
	const r = (buf[0]! << 24) | (buf[1]! << 16) | (buf[2]! << 8) | buf[3]!;
	return (ts >>> 0) ^ r;
}

function getEnergyForColor(color: OrbColor, rng: () => number): number {
	const ratio = color === 'rainbow' ? 0.5 : COLOR_RATIOS[color];
	const base = ratio * 1.2;
	const jitter = (rng() - 0.5) * 0.25;
	return Math.max(0.05, Math.min(0.98, base + jitter));
}

export interface Orb {
	color: OrbColor;
	image: string;
	energy: number;
}

const roomCache: Record<string, Orb[]> = {};
const allUsedImagesByRoute: Record<string, Set<string>> = {};

function getUsedSetForRoute(roomPath: string): Set<string> {
	if (!allUsedImagesByRoute[roomPath]) allUsedImagesByRoute[roomPath] = new Set();
	return allUsedImagesByRoute[roomPath]!;
}

export function isImageUsed(path: string, roomPath: string): boolean {
	return getUsedSetForRoute(roomPath).has(path);
}

export function markImagesUsed(paths: string[], roomPath: string): void {
	const set = getUsedSetForRoute(roomPath);
	paths.forEach((p) => set.add(p));
}

function pickAnyUnusedImage(
	roomPath: string,
	usedThisRoom: Set<string>,
	rng: () => number,
): string {
	const routeUsed = getUsedSetForRoute(roomPath);
	const all: string[] = [];
	for (const images of Object.values(ORB_IMAGES_BY_COLOR)) {
		for (const p of images) {
			if (!routeUsed.has(p) && !usedThisRoom.has(p)) all.push(p);
		}
	}
	if (all.length === 0) return '';
	const pick = all[Math.floor(rng() * all.length)]!;
	usedThisRoom.add(pick);
	routeUsed.add(pick);
	return pick;
}

function pickImageForColor(
	roomPath: string,
	color: OrbColor,
	usedThisRoom: Set<string>,
	rng: () => number,
): string {
	const routeUsed = getUsedSetForRoute(roomPath);
	const pool = ORB_IMAGES_BY_COLOR[color] ?? [];
	const prefer = pool.filter((path) => !routeUsed.has(path) && !usedThisRoom.has(path));
	if (prefer.length > 0) {
		const pick = prefer[Math.floor(rng() * prefer.length)]!;
		usedThisRoom.add(pick);
		routeUsed.add(pick);
		return pick;
	}
	if (color === 'rainbow') {
		return pickAnyUnusedImage(roomPath, usedThisRoom, rng);
	}
	return '';
}

function generateRoomOrbs(roomPath: string, rng: () => number): Orb[] {
	const cfg = ROOM_CONFIG[roomPath];
	if (!cfg) return [];

	const total = cfg.total;
	const usedThisRoom = new Set<string>();

	const rainbowSlot = Math.floor(rng() * total);
	const colorSlots: OrbColor[] = [];
	const remaining = total - 1;
	for (const [color, ratio] of COLOR_CHANCES) {
		const n = Math.round(remaining * ratio);
		for (let i = 0; i < n && colorSlots.length < remaining; i++) {
			colorSlots.push(color);
		}
	}
	while (colorSlots.length < remaining) colorSlots.push('red');
	while (colorSlots.length > remaining) colorSlots.pop();
	colorSlots.splice(rainbowSlot, 0, 'rainbow');

	for (let i = colorSlots.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[colorSlots[i], colorSlots[j]] = [colorSlots[j]!, colorSlots[i]!];
	}

	const result: Orb[] = [];
	for (let i = 0; i < total; i++) {
		const color = colorSlots[i]!;
		const energy = getEnergyForColor(color, rng);
		const image = pickImageForColor(roomPath, color, usedThisRoom, rng);
		result.push({ color, image, energy });
	}
	return result;
}

export function invalidateRoomCache(roomPath?: string): void {
	if (roomPath != null) {
		delete roomCache[roomPath];
		delete allUsedImagesByRoute[roomPath];
	} else {
		for (const k of Object.keys(roomCache)) delete roomCache[k];
		for (const k of Object.keys(allUsedImagesByRoute)) delete allUsedImagesByRoute[k];
	}
}

export function generateOrbs(count: number, slotId: string, roomPath: string): Orb[] {
	const cfg = ROOM_CONFIG[roomPath];
	if (!cfg) return [];

	if (!roomCache[roomPath]) {
		const seed = getSeed();
		const rng = mulberry32(seed);
		roomCache[roomPath] = generateRoomOrbs(roomPath, rng);
	}

	const pool = roomCache[roomPath]!;
	let slot = cfg.slots.find((s) => s.id === slotId);
	if (!slot && slotId.includes('-')) {
		const baseId = slotId.replace(/-\d+$/, '');
		slot = cfg.slots.find((s) => s.id === baseId);
	}
	if (!slot) return pool.slice(0, count);

	const take = Math.min(count, slot.count);
	return pool.slice(slot.start, slot.start + take);
}

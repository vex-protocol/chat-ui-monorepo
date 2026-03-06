/**
 * Convert all orb images to WebP at 440px max dimension (2x retina for 220px display).
 * Creates .webp files alongside originals.
 * Run: node apps/website/scripts/optimize-orbs.mjs
 */
import sharp from 'sharp';
import { readdir, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const ORBS_DIR = new URL('../static/orbs', import.meta.url).pathname;
const MAX_DIM = 200;
const QUALITY = 60;
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png']);

async function walk(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const files = [];
	for (const e of entries) {
		const full = join(dir, e.name);
		if (e.isDirectory()) files.push(...(await walk(full)));
		else if (IMAGE_EXTS.has(extname(e.name).toLowerCase())) files.push(full);
	}
	return files;
}

const files = await walk(ORBS_DIR);
let converted = 0;
let skipped = 0;
let totalSaved = 0;

for (const file of files) {
	const webpPath = file.replace(/\.(jpg|jpeg|png)$/i, '.webp');
	try {
		// Overwrite existing webp files to re-optimize

		const info = await sharp(file).metadata();
		const needsResize = (info.width ?? 0) > MAX_DIM || (info.height ?? 0) > MAX_DIM;

		let pipeline = sharp(file);
		if (needsResize) pipeline = pipeline.resize(MAX_DIM, MAX_DIM, { fit: 'inside' });
		await pipeline.webp({ quality: QUALITY }).toFile(webpPath);

		const origSize = (await stat(file)).size;
		const newSize = (await stat(webpPath)).size;
		const saved = origSize - newSize;
		totalSaved += saved;
		converted++;
		console.log(`${file.replace(ORBS_DIR, '')} → .webp (${(origSize / 1024).toFixed(0)}K → ${(newSize / 1024).toFixed(0)}K, saved ${(saved / 1024).toFixed(0)}K)`);
	} catch (err) {
		console.error(`FAIL: ${file}: ${err.message}`);
	}
}

console.log(`\nDone: ${converted} converted, ${skipped} skipped, ${(totalSaved / 1024 / 1024).toFixed(1)} MB saved`);

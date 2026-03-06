import { SITE_URL } from '$lib/config';

const pages = [
	{ path: '/', priority: '1.0', changefreq: 'weekly' },
	{ path: '/security', priority: '0.9', changefreq: 'monthly' },
	{ path: '/download', priority: '0.8', changefreq: 'weekly' },
	{ path: '/privacy', priority: '0.5', changefreq: 'monthly' },
	{ path: '/about', priority: '0.5', changefreq: 'monthly' },
	{ path: '/vs/signal', priority: '0.8', changefreq: 'monthly' },
	{ path: '/vs/discord', priority: '0.8', changefreq: 'monthly' },
	{ path: '/compare/signal-vs-discord', priority: '0.7', changefreq: 'monthly' },
	{ path: '/alternatives/signal', priority: '0.7', changefreq: 'monthly' },
	{ path: '/alternatives/discord', priority: '0.7', changefreq: 'monthly' },
];

export const prerender = true;

export function GET() {
	const urls = pages
		.map(
			(p) => `  <url>
    <loc>${SITE_URL}${p.path}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
		)
		.join('\n');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600',
		},
	});
}

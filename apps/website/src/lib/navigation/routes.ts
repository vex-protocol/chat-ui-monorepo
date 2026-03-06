export interface RouteDef {
	path: string;
	label: string;
	sectionIds: readonly string[];
}

export const LATERAL_ROUTES: RouteDef[] = [
	{ path: '/', label: 'Home', sectionIds: ['hero', 'about', 'features'] },
	{ path: '/security', label: 'Security', sectionIds: ['security-hero', 'security-model', 'security-comparison'] },
	{ path: '/download', label: 'Download', sectionIds: ['download-hero', 'download-releases'] },
	{ path: '/privacy', label: 'Privacy', sectionIds: ['privacy-hero', 'privacy-content'] },
	{ path: '/about', label: 'About', sectionIds: ['about-hero', 'about-team'] },
	{ path: '/compare/signal-vs-discord', label: 'Compare', sectionIds: ['compare-hero', 'compare-table', 'compare-signal', 'compare-discord', 'compare-gap', 'compare-verdict'] },
];

export function routeIndex(pathname: string): number {
	const i = LATERAL_ROUTES.findIndex((r) => r.path === pathname);
	return i >= 0 ? i : 0;
}

export function pathForIndex(index: number): string {
	return LATERAL_ROUTES[Math.max(0, Math.min(index, LATERAL_ROUTES.length - 1))].path;
}

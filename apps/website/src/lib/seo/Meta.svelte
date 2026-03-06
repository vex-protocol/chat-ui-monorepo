<script lang="ts">
	import { SITE_NAME, SITE_URL, SITE_DESCRIPTION, DEFAULT_OG_IMAGE } from '$lib/config';

	interface Props {
		title?: string;
		description?: string;
		ogImage?: string;
		ogType?: string;
		path?: string;
	}

	let {
		title,
		description = SITE_DESCRIPTION,
		ogImage = DEFAULT_OG_IMAGE,
		ogType = 'website',
		path = '',
	}: Props = $props();

	const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
	const canonicalUrl = `${SITE_URL}${path}`;
	const ogImageUrl = ogImage.startsWith('http') ? ogImage : `${SITE_URL}${ogImage}`;
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonicalUrl} />

	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={ogImageUrl} />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:type" content={ogType} />
	<meta property="og:site_name" content={SITE_NAME} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImageUrl} />
</svelte:head>

# ADR-004: Reimplement vex.wtf as a static-first site with SSR deep links and SEO

## Status

Proposed

## Context

The Vex website (`vex.wtf`) is a separate repo (`vex-chat/vex-website`) — a React 17 SPA deployed to GitHub Pages. It serves two purposes: marketing landing page and deep link handler for `vex://` protocol URLs (invite flow).

**Problems with the current site:**

1. **Invisible to search engines.** The site is a client-rendered SPA. Crawlers see `<noscript>You need to enable JavaScript to run this app.</noscript>` and nothing else. No meta description, no Open Graph tags, no Twitter cards, no structured data. Google cannot index any content. Link previews on social platforms are blank.

2. **Deep link handler is fragile.** `/invite/:id` fetches from `api.vex.wtf` using msgpack at runtime, renders invite details client-side, and offers a `vex://invite/{id}` protocol link. This fails for users without JavaScript, shows no useful preview when shared in chat/social, and the `vex://` protocol only works if the app is already installed.

3. **Dead dependencies.** React 17, react-scripts (CRA — deprecated), react-router-dom v5, Bulma CSS, msgpack-lite, Sass. CRA is officially unmaintained. The build requires `NODE_OPTIONS=--openssl-legacy-provider` to work at all.

4. **No SEO infrastructure.** No `sitemap.xml`, no `robots.txt`, no canonical URLs, no per-page `<title>` tags, no `<meta name="description">`. The HTML `<meta>` tag reads `name="vex messenger"` which is not a valid meta name.

5. **Separate repo friction.** The website is disconnected from the monorepo. It references `api.vex.wtf` endpoints and GitHub release URLs via hardcoded constants. No shared types, no shared design tokens, no atomic deploys with the server.

6. **GitHub Pages limitations.** No server-side rendering, no dynamic routes, no redirect rules beyond a single `404.html` SPA hack. Cannot set custom HTTP headers (Cache-Control, security headers, CORS).

**What the site needs to do:**

- **Marketing pages:** Home, security/crypto explainer, download, privacy policy, team/about
- **Deep link bridge:** `/invite/:id` → show preview with OG tags → "Open in Vex" or "Download Vex"
- **SEO fundamentals:** Per-page titles, descriptions, OG/Twitter tags, JSON-LD structured data, sitemap, robots.txt
- **Fast and indexable:** Content must be in the initial HTML, not hydrated from JavaScript

**Constraints:**
- Solo developer — complexity must be minimal
- Privacy-first — no analytics, no tracking, no third-party scripts
- Must handle `vex://` deep links with graceful fallback
- Should live in the monorepo for shared types and atomic deploys
- Must work on `vex.wtf` domain
- Preserve the lateral+vertical navigation system — it's a signature part of the site's identity

## Decision

Reimplement the website as `apps/website` in the monorepo using **SvelteKit with static adapter** as the primary build target, deployed to **Vercel**.

```
apps/website/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte          # Shell: nav, footer, global meta
│   │   ├── +page.svelte            # Home
│   │   ├── security/+page.svelte   # Crypto model explainer
│   │   ├── download/+page.svelte   # Platform downloads
│   │   ├── privacy/+page.svelte    # Privacy policy
│   │   ├── about/+page.svelte      # Team / about
│   │   └── invite/
│   │       └── [id]/
│   │           ├── +page.server.ts  # Fetch invite → inject OG tags
│   │           └── +page.svelte     # Invite preview + deep link
│   ├── lib/
│   │   ├── components/             # Reusable UI components
│   │   ├── navigation/             # Lateral+vertical nav engine (ported from old site)
│   │   ├── seo/                    # Head meta, JSON-LD helpers
│   │   └── config.ts               # API URLs, feature flags
│   └── app.html                    # HTML shell with global meta
├── static/
│   ├── robots.txt
│   ├── sitemap.xml                 # Or generated at build
│   ├── og-image.png                # Default social card
│   └── favicon.ico
├── svelte.config.js                # Static adapter + prerender
└── package.json
```

### Stack

| Choice | Why |
|---|---|
| **SvelteKit** | Already used for desktop app — shared knowledge. Static adapter prerenders everything to HTML at build time. File-based routing eliminates boilerplate. |
| **Static adapter (primary)** | Marketing pages prerendered to static HTML — fast, indexable, cacheable. Zero JS required for content pages. |
| **Server route for `/invite/[id]`** | The one dynamic route. Fetches invite metadata at request time, injects OG meta tags into the HTML `<head>` so link previews work on Discord, Slack, iMessage, Twitter. Runs as a Vercel serverless function. |
| **Vercel** | Already our host. Serverless functions for the invite route. Custom headers via `vercel.json`. Edge network, custom domain, preview deployments on PR. Free tier covers our traffic. |
| **Tailwind CSS** | Already in the monorepo. Utility-first, small bundle, no Sass/Bulma dependency. |

### SEO implementation

Every page gets:

```svelte
<svelte:head>
  <title>{pageTitle} — Vex</title>
  <meta name="description" content={pageDescription} />
  <meta property="og:title" content={pageTitle} />
  <meta property="og:description" content={pageDescription} />
  <meta property="og:image" content={ogImage} />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="canonical" href={canonicalUrl} />
</svelte:head>
```

Homepage adds JSON-LD structured data:

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Vex",
  "description": "End-to-end encrypted, self-hosted chat platform",
  "applicationCategory": "CommunicationApplication",
  "operatingSystem": "Windows, macOS, Linux",
  "license": "https://www.gnu.org/licenses/agpl-3.0.html",
  "offers": { "@type": "Offer", "price": "0" }
}
```

### Deep link flow

The `/invite/[id]` route handles three audiences differently:

| Visitor | What they see |
|---|---|
| **Crawler / link preview** | OG tags with server name, inviter, "Join on Vex" — injected server-side. No JavaScript needed. |
| **User with Vex installed** | Page renders invite details + "Open in Vex" button → `vex://invite/{id}`. Timeout fallback to download page if protocol handler fails. |
| **User without Vex** | Same page, but protocol handler fails silently → after 2s timeout, shows "Download Vex" with platform-detected download link. |

Implementation:

```typescript
// +page.server.ts
export async function load({ params, fetch }) {
  const res = await fetch(`${API_BASE}/invites/${params.id}`);
  if (!res.ok) return { invite: null };

  const invite = await res.json();
  const server = await fetch(`${API_BASE}/servers/${invite.serverID}`).then(r => r.json());
  const inviter = await fetch(`${API_BASE}/users/${invite.owner}`).then(r => r.json());

  return {
    invite,
    server,
    inviter,
    meta: {
      title: `Join ${server.name} on Vex`,
      description: `${inviter.username} invited you to ${server.name}`,
      image: `${API_BASE}/avatars/${server.icon}`,
    }
  };
}
```

### Content pages that drive organic traffic

| Page | Target queries | Why it matters |
|---|---|---|
| `/` (Home) | "vex chat", "vex.wtf", brand searches | Landing page, hero + value props |
| `/security` | "self-hosted encrypted chat", "e2e encrypted team chat", "discord alternative privacy" | Our differentiator. Explain the crypto model (X3DH, device keys, NaCl) in plain language. This is the page that attracts privacy-conscious users from search. |
| `/download` | "vex download", "vex chat download" | Platform-detected download links from GitHub releases |
| `/privacy` | "vex privacy policy" | Legal requirement, builds trust, fetchable from GitHub like the old site |
| `/about` | "vex heavy industries", "who makes vex" | Team, mission, AGPL commitment |

### What we keep

| Old feature | How it carries forward |
|---|---|
| **Lateral+vertical navigation** | Port to Svelte. The custom nav engine (wheel debouncing, touch gestures, keyboard arrows, lateral route switching, vertical section scrolling) is a signature UX. Rewrite AppNavigator, LateralRouteMenu, PageIndicator, PositionGauge, and RouteIndicator as Svelte components. The `routeConfig.ts` pattern (route → section IDs, `?depth=N` query param) maps cleanly to SvelteKit's page structure. |
| **Procedural visuals** | Port WitchyOrbs, animated hero, procedural image generation. These define the site's identity. Ensure the hero section's static HTML content (tagline, description) is in the server-rendered markup for crawlers — the animations layer on top via client-side hydration. |

### What we drop

| Old feature | Verdict |
|---|---|
| Zalgo text effects | Drop. Harms accessibility — confuses screen readers and search engine text extraction. |
| msgpack API responses | Drop. Spire's new API returns JSON. No msgpack dependency needed. |
| Bulma + Sass | Drop. Replace with Tailwind (already in monorepo). |
| react-scripts (CRA) | Drop. Unmaintained, requires `--openssl-legacy-provider` hack. |
| `DOWNLOAD_ENABLED` feature flag | Drop. Download page is always available. If no releases exist, say "coming soon." |
| Mobile-specific view variants (HomePanel, DownloadPanel, PrivacyPanel) | Drop. Use responsive design instead of duplicate components. |

## Rationale

1. **A page that crawlers can't see doesn't exist.** The current site returns empty HTML. Google has deprioritized client-rendered SPAs since 2023. Prerendered HTML is the baseline for discoverability, not a nice-to-have.

2. **Deep link previews require server rendering.** When someone pastes a `vex.wtf/invite/abc` link in Discord or iMessage, the platform fetches the URL and reads OG tags from the HTML. A client-rendered SPA returns nothing — the preview is blank. Server-rendering the invite route means link previews show the server name, inviter, and a call to action.

3. **SvelteKit is already in our stack.** The desktop app is Svelte 5. Using SvelteKit for the website means shared component knowledge, no new framework to learn, and potential for shared UI components from `packages/ui`.

4. **Vercel over GitHub Pages.** GitHub Pages cannot set custom HTTP headers, has no serverless functions, no redirect rules, and no server-side rendering. Vercel provides all of these on the free tier, plus preview deployments on every PR. Already our host — no new vendor.

5. **Keep the navigation, fix the rendering.** The lateral+vertical navigation system is a signature UX — worth porting. The problem isn't the navigation; it's that the content underneath is invisible to crawlers. With SvelteKit, the page content is prerendered as static HTML and the navigation layers on top via client hydration. Crawlers see the content. Users get the experience.

6. **Monorepo integration eliminates drift.** The current site hardcodes API URLs and has no shared types. Moving to `apps/website` means it shares `packages/types` for invite/server/user interfaces, gets atomic deploys, and stays in sync with API changes.

## Trade-offs

### What we gain

- **Search engine visibility.** Prerendered HTML with meta tags, structured data, sitemap — Google can actually index the site.
- **Link previews.** Invite links show server name and inviter on Discord, Slack, iMessage, Twitter.
- **Performance.** Static HTML + minimal JS. No React runtime, no SPA hydration for content pages. Sub-second loads.
- **Maintainability.** SvelteKit file-based routing. Tailwind instead of Bulma + Sass. Navigation ported to Svelte (same logic, better framework).
- **SEO content.** `/security` page targeting "self-hosted encrypted chat" and similar queries — our best organic traffic opportunity.
- **Custom headers.** Security headers (CSP, HSTS, X-Frame-Options) and cache control via `vercel.json`.
- **Preview deployments.** Every PR gets a preview URL on Vercel. Design changes are reviewable before merge.

### What we give up

- **Zalgo text.** The zalgo effects are dropped for accessibility. Everything else visual is ported.
- **GitHub Pages simplicity.** Vercel has slightly more configuration than a `gh-pages` push, but we're already on Vercel.
- **Standalone repo.** The website moves into the monorepo, which means `pnpm install` installs website deps too. Mitigated by pnpm's workspace filtering (`--filter @vex-chat/website`).

### Why this is acceptable

- Solo developer: nobody else's workflow is disrupted.
- The visual identity is preserved — navigation system and procedural visuals port to Svelte. Only zalgo is dropped.
- Vercel is already our host — no new vendor relationship.
- The website is tiny (5 routes). Migration is a weekend of work, not a quarter-long project.

## Consequences

### Positive

- `vex.wtf` becomes indexable by search engines for the first time.
- Invite links produce rich previews when shared on any platform.
- The `/security` page becomes an organic traffic entry point for privacy-conscious users searching for alternatives to Discord/Slack.
- One repo, one `pnpm dev`, shared types and tokens.
- Security headers hardened via `vercel.json`.

### Negative

- **Navigation port effort.** The lateral+vertical navigation engine (AppNavigator, wheel debouncing, touch gestures, keyboard handlers, route indicators) must be rewritten from React to Svelte. The logic is portable but the component APIs differ.
- **Invite route requires serverless function.** The invite page can't be fully prerendered because invite data is dynamic. Vercel serverless functions handle this, but it's a runtime dependency.
- **Procedural visuals port.** WitchyOrbs, procedural image generation, and animated hero need Svelte equivalents. react-spring animations become Svelte transitions or CSS animations.

### Mitigation

- Old `vex-chat/vex-website` repo remains for reference.
- Invite route fallback: if the serverless function fails, client-side fetch kicks in (progressive enhancement, not hard dependency).
- Navigation port can be incremental — start with standard nav for SEO pages, add lateral+vertical system once the Svelte components are solid.

## Revisit Triggers

- **Federation / multiple servers.** If Vex supports multiple independent servers, the invite flow may need to resolve which server to query — currently assumes `api.vex.wtf`.
- **Traffic exceeds Vercel free tier.** Vercel Hobby allows 100GB bandwidth/month and 100K serverless function invocations/day. If traffic exceeds this, evaluate Vercel Pro ($20/month) or move invite SSR to Spire itself.
- **Mobile app deep links.** When the React Native app ships, `/invite/[id]` needs platform detection to route to App Store / Play Store links in addition to `vex://` protocol. The server-rendered route already supports this — just add platform detection logic.

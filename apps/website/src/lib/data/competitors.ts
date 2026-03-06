export interface PricingTier {
	tier: string;
	price: string;
	notes: string;
}

export interface FeatureRating {
	label: string;
	vex: 'yes' | 'partial' | 'no';
	competitor: 'yes' | 'partial' | 'no';
	vexNote: string;
	competitorNote: string;
}

export interface Competitor {
	name: string;
	slug: string;
	website: string;
	tagline: string;
	description: string;
	idealFor: string;
	pricing: PricingTier[];
	strengths: string[];
	weaknesses: string[];
	commonComplaints: string[];
	migrationNote: string;
	features: FeatureRating[];
}

export const vex = {
	name: 'Vex',
	tagline: 'Privacy is not a crime.',
	description:
		'End-to-end encrypted, self-hosted chat platform. Servers, channels, and DMs — all encrypted by default. Open source under AGPL-3.0.',
	idealFor:
		'Teams and communities that want Discord-style collaboration with Signal-level privacy. People who refuse to choose between features and encryption.',
	pricing: [{ tier: 'Free', price: '$0', notes: 'Self-hosted. No paid tiers. No feature gates.' }],
	strengths: [
		'E2E encryption on every message by default — not opt-in, not paid',
		'Self-hostable — you control the server and all metadata',
		'Device-key identity — no phone number, no email required',
		'Servers and channels — real group collaboration, not just group chats',
		'Fully open source (AGPL-3.0) — audit every line',
		'Zero analytics, zero tracking, zero profiling',
	],
};

export const signal: Competitor = {
	name: 'Signal',
	slug: 'signal',
	website: 'https://signal.org',
	tagline: 'Say hello to privacy.',
	description:
		'Signal is the gold standard for private 1:1 messaging. End-to-end encrypted by default with a battle-tested protocol used by journalists, activists, and security researchers worldwide.',
	idealFor:
		'Individuals who need private 1:1 and small group messaging. Journalists, activists, and anyone whose threat model centers on private conversations rather than team collaboration.',
	pricing: [{ tier: 'Free', price: '$0', notes: 'Donation-funded nonprofit.' }],
	strengths: [
		'Battle-tested Signal Protocol — the standard other apps adopt',
		'Massive user base — your contacts are likely already on it',
		'Simple, clean UX — minimal learning curve',
		'Strong reputation among security researchers',
		'Disappearing messages with granular timers',
		'Sealed sender — hides metadata from the server',
	],
	weaknesses: [
		'Requires a phone number to register — links identity to PII',
		'Groups are basic — no servers, no channels, no organization',
		'Not practically self-hostable — federated in theory, centralized in practice',
		'No desktop-first experience — phone is primary device',
		'Limited file sharing and media capabilities',
		'No community/team features — not built for collaboration',
	],
	commonComplaints: [
		'Phone number requirement is a dealbreaker for anonymity',
		'Group chats become chaotic at scale — no threading or channels',
		'Desktop app feels secondary to mobile',
		'No way to run your own server without significant effort',
		'Missing features that teams need — no roles, no permissions, no channels',
	],
	migrationNote:
		'Signal and Vex solve different problems. Signal is a private messenger. Vex is a private collaboration platform. If you need servers, channels, and team features with E2E encryption, Vex fills the gap Signal leaves.',
	features: [
		{
			label: 'E2E encryption by default',
			vex: 'yes',
			competitor: 'yes',
			vexNote: 'X3DH + NaCl on all messages',
			competitorNote: 'Signal Protocol on all messages',
		},
		{
			label: 'No phone number required',
			vex: 'yes',
			competitor: 'no',
			vexNote: 'Device key pair identity',
			competitorNote: 'Phone number required to register',
		},
		{
			label: 'Servers and channels',
			vex: 'yes',
			competitor: 'no',
			vexNote: 'Discord-style servers with channels',
			competitorNote: 'Flat group chats only',
		},
		{
			label: 'Self-hostable',
			vex: 'yes',
			competitor: 'partial',
			vexNote: 'Single binary, designed for self-hosting',
			competitorNote: 'Technically possible but not supported',
		},
		{
			label: 'Open source',
			vex: 'yes',
			competitor: 'yes',
			vexNote: 'AGPL-3.0 — forks must stay open',
			competitorNote: 'AGPL-3.0 — client and server',
		},
		{
			label: 'Disappearing messages',
			vex: 'no',
			competitor: 'yes',
			vexNote: 'Not yet implemented',
			competitorNote: 'Granular timers per-conversation',
		},
		{
			label: 'Sealed sender (metadata protection)',
			vex: 'partial',
			competitor: 'yes',
			vexNote: 'Self-hosting controls metadata; no sealed sender yet',
			competitorNote: 'Built-in sealed sender protocol',
		},
		{
			label: 'Group collaboration features',
			vex: 'yes',
			competitor: 'no',
			vexNote: 'Servers, channels, roles',
			competitorNote: 'Basic group chats (up to 1000)',
		},
		{
			label: 'File sharing',
			vex: 'yes',
			competitor: 'yes',
			vexNote: 'Encrypted file attachments',
			competitorNote: 'Encrypted media and files',
		},
		{
			label: 'Multi-device support',
			vex: 'yes',
			competitor: 'yes',
			vexNote: 'Independent device keys, fan-out delivery',
			competitorNote: 'Linked devices via QR code',
		},
	],
};

export const discord: Competitor = {
	name: 'Discord',
	slug: 'discord',
	website: 'https://discord.com',
	tagline: 'Your place to talk and hang out.',
	description:
		'Discord is the dominant platform for online communities. Rich voice, video, and text features with an enormous ecosystem of bots and integrations. Used by gaming communities, open source projects, and increasingly by businesses.',
	idealFor:
		'Large public communities, gaming groups, and anyone who prioritizes feature richness, integrations, and ease of use over privacy.',
	pricing: [
		{ tier: 'Free', price: '$0', notes: 'Full features with file size and quality limits.' },
		{
			tier: 'Nitro Basic',
			price: '$2.99/mo',
			notes: 'Larger uploads, custom emoji everywhere.',
		},
		{
			tier: 'Nitro',
			price: '$9.99/mo',
			notes: 'HD streaming, server boosts, larger uploads.',
		},
	],
	strengths: [
		'Best-in-class UX for communities — channels, threads, forums, stages',
		'Massive ecosystem — thousands of bots, integrations, and tools',
		'Voice and video channels — always-on rooms, screen sharing, streaming',
		'Free tier is genuinely generous for most use cases',
		'Huge user base — 200M+ monthly active users',
		'Constantly shipping new features',
	],
	weaknesses: [
		'Zero end-to-end encryption — Discord reads all message content',
		'Aggressive data collection — messages, behavior, device info, purchase history',
		'Closed source — no way to verify privacy claims',
		'Not self-hostable — your data lives on Discord\'s servers, period',
		'Account bans can wipe years of community history',
		'Monetization pressure — increasingly pushing Nitro and server boosts',
	],
	commonComplaints: [
		'Discord scans and stores all messages in plaintext on their servers',
		'Account disabled without warning, losing access to all servers and history',
		'Privacy policy allows sharing data with advertisers and "business partners"',
		'No way to export or back up server data',
		'Increasingly bloated — features nobody asked for while ignoring privacy',
		'Moderation tools are powerful but the platform itself is the biggest threat to your data',
	],
	migrationNote:
		'If your community uses Discord for the servers-and-channels model but you\'re uncomfortable with the surveillance, Vex gives you the same structure — servers, channels, DMs — with end-to-end encryption on everything. The tradeoff: Vex is younger and doesn\'t have Discord\'s bot ecosystem or voice features yet.',
	features: [
		{
			label: 'E2E encryption by default',
			vex: 'yes',
			competitor: 'no',
			vexNote: 'X3DH + NaCl on all messages',
			competitorNote: 'TLS only — server reads plaintext',
		},
		{
			label: 'Servers and channels',
			vex: 'yes',
			competitor: 'yes',
			vexNote: 'Encrypted servers with channels',
			competitorNote: 'Industry-leading server features',
		},
		{
			label: 'Voice and video',
			vex: 'no',
			competitor: 'yes',
			vexNote: 'Not yet implemented',
			competitorNote: 'Voice channels, video, screen share, streaming',
		},
		{
			label: 'Self-hostable',
			vex: 'yes',
			competitor: 'no',
			vexNote: 'Single binary, self-host everything',
			competitorNote: 'Not possible — cloud only',
		},
		{
			label: 'Open source',
			vex: 'yes',
			competitor: 'no',
			vexNote: 'AGPL-3.0 — fully auditable',
			competitorNote: 'Closed source',
		},
		{
			label: 'Bot ecosystem',
			vex: 'no',
			competitor: 'yes',
			vexNote: 'Not yet available',
			competitorNote: 'Thousands of bots and integrations',
		},
		{
			label: 'Threads and forums',
			vex: 'no',
			competitor: 'yes',
			vexNote: 'Not yet implemented',
			competitorNote: 'Forum channels, threads, stages',
		},
		{
			label: 'Zero analytics/tracking',
			vex: 'yes',
			competitor: 'no',
			vexNote: 'No tracking whatsoever',
			competitorNote: 'Extensive behavioral tracking and profiling',
		},
		{
			label: 'File sharing',
			vex: 'yes',
			competitor: 'yes',
			vexNote: 'Encrypted file attachments',
			competitorNote: 'Up to 500MB with Nitro',
		},
		{
			label: 'Multi-device support',
			vex: 'yes',
			competitor: 'yes',
			vexNote: 'Independent device keys',
			competitorNote: 'Session-based, any device',
		},
		{
			label: 'No phone/email to register',
			vex: 'yes',
			competitor: 'no',
			vexNote: 'Device key pair identity',
			competitorNote: 'Email required, phone for verification',
		},
		{
			label: 'Data portability',
			vex: 'yes',
			competitor: 'partial',
			vexNote: 'Self-hosted — you own the database',
			competitorNote: 'GDPR data export only — no server backup',
		},
	],
};

export const competitors = { signal, discord };

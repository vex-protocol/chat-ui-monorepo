import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	try {
		const [contentRes, commitsRes] = await Promise.all([
			fetch(
				'https://raw.githubusercontent.com/vex-chat/vex-privacy-policy/master/README.md',
			),
			fetch(
				'https://api.github.com/repos/vex-chat/vex-privacy-policy/commits?per_page=1',
			),
		]);

		const markdown = contentRes.ok ? await contentRes.text() : null;

		let lastUpdated: string | null = null;
		if (commitsRes.ok) {
			const commits = await commitsRes.json();
			if (Array.isArray(commits) && commits.length > 0) {
				lastUpdated = commits[0].commit?.committer?.date ?? null;
			}
		}

		return { markdown, lastUpdated };
	} catch {
		return { markdown: null, lastUpdated: null };
	}
};

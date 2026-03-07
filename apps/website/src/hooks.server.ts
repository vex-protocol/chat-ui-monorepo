import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	return resolve(event, {
		preload: ({ type, path }) => {
			if (type === 'js') {
				return path.includes('entry/start') || path.includes('entry/app');
			}
			return type === 'css' || type === 'font';
		},
	});
};

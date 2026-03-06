/**
 * Reactive mobile detection using matchMedia.
 * Returns an object with a reactive `value` property.
 */
export function useIsMobile(breakpoint = 768) {
	let value = $state(false);

	if (typeof window !== 'undefined') {
		const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
		value = mql.matches;
		mql.addEventListener('change', (e) => {
			value = e.matches;
		});
	}

	return {
		get value() {
			return value;
		},
	};
}

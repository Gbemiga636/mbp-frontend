// MBP deploy config
(() => {
	const host = window.location.hostname;
	const isLocal =
		window.location.protocol === 'file:' ||
		host === 'localhost' ||
		host === '127.0.0.1' ||
		host === '::1';

	// Local dev: auto-infer http://localhost:4000
	if (isLocal) return;

	// Netlify / production: API is served from same origin via /api/* rewrite
	if (host.endsWith('.netlify.app') || host === 'mbplingerie.com.ng' || host === 'www.mbplingerie.com.ng') {
		window.MBP_API_BASE = window.location.origin;
		return;
	}

	// Fallback for other hosts
	window.MBP_API_BASE = window.location.origin;
})();

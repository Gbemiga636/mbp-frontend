// MBP deploy config
//
// Set this to your backend URL when deploying the frontend to GitHub Pages
// and the backend to Render.
//
// Example:
(() => {
	const isLocal =
		(window.location.protocol === 'file:' ||
			window.location.hostname === 'localhost' ||
			window.location.hostname === '127.0.0.1' ||
			window.location.hostname === '::1');

	// In local dev, leave unset so scripts auto-infer http://localhost:4000.
	if (isLocal) return;

	// In production (GitHub Pages / hosted), point to Render backend.
	// Temporary backend (switch back when ready):
	window.MBP_API_BASE = 'https://mbp-backend-pqvs.onrender.com';
})();
//
// Leave unset for local development (the scripts auto-infer http://localhost:4000).

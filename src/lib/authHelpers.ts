/**
 * Dynamically resolves the authentication redirect URL for Supabase Auth flows:
 * - Localhost during development (e.g. http://localhost:3000 or http://localhost:5173)
 * - Deployed Netlify domain in production (e.g. https://your-app.netlify.app)
 * - AI Studio preview URL in preview environment
 *
 * Never hardcodes localhost as the production redirect.
 */
export function getAuthRedirectUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    // Dynamically captures whatever host/port the browser is currently running on
    return window.location.origin.replace(/\/+$/, '');
  }

  // Fallback for SSR or build environments
  const fallback =
    import.meta.env.VITE_SITE_URL ||
    import.meta.env.VITE_APP_URL ||
    import.meta.env.APP_URL ||
    '';

  return fallback.replace(/\/+$/, '');
}

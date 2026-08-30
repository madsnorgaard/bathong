/**
 * The public site origin for links in email (never the API host). SITE_URL,
 * falling back to the first CORS origin, which is the site in every
 * environment.
 */
export const siteUrl = (): string =>
  (process.env.SITE_URL || (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',')[0])
    .trim()
    .replace(/\/$/, '')

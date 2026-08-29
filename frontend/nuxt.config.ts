// https://nuxt.com/docs/api/configuration/nuxt-config
const cmsUrl = process.env.NUXT_PUBLIC_CMS_URL || 'http://localhost:3001'
const cmsOrigin = new URL(cmsUrl).origin
const analyticsOrigin = 'https://analytics.theazanianprepper.online'
const isProd = process.env.NODE_ENV === 'production'

// Baseline security headers (#37), declared once: routeRules puts them on
// every response (images, share cards, map tiles), nuxt-security re-applies
// the same values on HTML renders alongside the CSP. COEP is deliberately
// absent - nothing needs cross-origin isolation, and it would force
// crossorigin attributes everywhere for zero gain. HSTS is Traefik's
// (docker-compose labels) - a second copy here would only drift.
const baseHeaders = {
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  // Safe as same-origin: no cross-origin popups, and every subresource
  // is same-origin (ipx proxies api images, map tiles live in /map).
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'x-dns-prefetch-control': 'off',
} as const

export default defineNuxtConfig({
  compatibilityDate: '2025-05-01',
  devtools: { enabled: false },
  modules: ['@nuxt/image', '@nuxt/fonts', '@nuxt/eslint', 'nuxt-security'],
  css: ['~/assets/css/main.css', '~/assets/css/app.css'],
  runtimeConfig: {
    // Server-only: internal container URL for SSR fetches (NUXT_CMS_INTERNAL_URL).
    cmsInternalUrl: process.env.NUXT_CMS_INTERNAL_URL || '',
    public: {
      // Public CMS base URL for the browser + media (NUXT_PUBLIC_CMS_URL).
      cmsUrl,
      // Canonical site origin for absolute og/canonical URLs (NUXT_PUBLIC_SITE_URL).
      // Never derived from request headers; share crawlers need a stable HTTPS origin.
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://bathong.africa',
    },
  },
  // Photographs: srcset at 480/840/1440/1920, AVIF then WebP, via ipx + sharp.
  // Spec: design-references/frontend-v2-direction.html section 06.
  // Components pass RELATIVE /api/media paths (utils/media.ts mediaSrc): ipx
  // resolves them through the alias below, so the domain allowlist can never
  // silently fall back to serving full-res originals. In production
  // NITRO_IPX_ALIAS/NITRO_IPX_HTTP_DOMAINS (compose) point the alias at the
  // internal Payload hostname instead.
  image: {
    // ipx fetches sources from here server-side. In production IPX_SOURCE_URL
    // is the internal Payload hostname (baked via Docker build arg) - the
    // public api URL is unreachable from inside the container (hairpin), so
    // using it hangs every /_ipx request. The aliased host must ALSO be in
    // domains: ipx validates the post-alias hostname against the allowlist.
    domains: [...new Set([cmsUrl, process.env.IPX_SOURCE_URL || cmsUrl].map((u) => new URL(u).host))],
    alias: { '/api/media': `${process.env.IPX_SOURCE_URL || cmsUrl}/api/media` },
    format: ['avif', 'webp'],
    // md 840 matches the real layout collapse (assets/css/app.css) - the
    // former 960 mis-switched sizes in the 841-959 band.
    screens: { xs: 480, md: 840, lg: 1440, xl: 1920 },
    quality: 75,
  },
  // Self-hosted at build time: no request to Google, one less origin on the
  // data budget, no visitor IP shared with a third party (POPIA).
  fonts: {
    families: [
      { name: 'Archivo Black', provider: 'google', weights: [400] },
      { name: 'Space Grotesk', provider: 'google', weights: [400, 500, 700] },
      { name: 'Space Mono', provider: 'google', weights: [400], styles: ['normal', 'italic'] },
    ],
  },
  routeRules: {
    '/**': { headers: { ...baseHeaders } },
    '/_ipx/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    // Self-hosted basemap extract; the filename is versioned (pta-inner-v1),
    // so it can cache forever. Route data itself rides on the walk document.
    '/map/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    '/share/**': { headers: { 'cache-control': 'public, max-age=86400' } },
  },
  // Content-Security-Policy (#37) via nuxt-security: every SSR <script> (the
  // Nuxt payload, the plausible stub, the bundle entry) gets a per-request
  // nonce, and 'strict-dynamic' lets the nonced entry load the chunks it
  // imports. No 'unsafe-inline' for scripts. Styles keep 'unsafe-inline'
  // because Vue SSR emits style attributes and nonces cannot cover those.
  // Everything else the module offers is off: Traefik owns rate limiting and
  // HSTS, uploads go straight to the API, and the xss validator rewrites
  // legitimate query strings (the archive's ?q=).
  security: {
    nonce: true,
    removeLoggers: false,
    rateLimiter: false,
    requestSizeLimiter: false,
    xssValidator: false,
    corsHandler: false,
    allowedMethodsRestricter: false,
    basicAuth: false,
    headers: {
      contentSecurityPolicy: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'nonce-{{nonce}}'", "'strict-dynamic'", analyticsOrigin],
        'script-src-attr': ["'none'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        // data:/blob: for maplibre's generated sprites and canvases
        'img-src': ["'self'", 'data:', 'blob:'],
        // the RSVP/photocall forms and member sign-in talk to the API host;
        // plausible beacons go to analytics
        'connect-src': ["'self'", cmsOrigin, analyticsOrigin],
        // maplibre runs its tile worker from a blob
        'worker-src': ["'self'", 'blob:'],
        // @nuxt/fonts self-hosts every face
        'font-src': ["'self'"],
        'frame-ancestors': ["'none'"],
        'frame-src': ["'none'"],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        // dev is plain http; upgrading there would break every asset
        'upgrade-insecure-requests': isProd,
      },
      xFrameOptions: baseHeaders['x-frame-options'],
      xContentTypeOptions: baseHeaders['x-content-type-options'],
      referrerPolicy: baseHeaders['referrer-policy'],
      permissionsPolicy: { camera: [], microphone: [], geolocation: [] },
      crossOriginOpenerPolicy: baseHeaders['cross-origin-opener-policy'],
      crossOriginResourcePolicy: baseHeaders['cross-origin-resource-policy'],
      xDNSPrefetchControl: baseHeaders['x-dns-prefetch-control'],
      crossOriginEmbedderPolicy: false,
      strictTransportSecurity: false,
      // legacy/IE-era headers, nothing here needs them
      xDownloadOptions: false,
      xPermittedCrossDomainPolicies: false,
      xXSSProtection: false,
      originAgentCluster: false,
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Bathong. - Street and documentary photography, from Pretoria outward',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Bathong. is a street and documentary photography collective. It starts in Pretoria and walks outward: photowalks, group edits, honest feedback from working photographers, and stories about people as they are.',
        },
        { name: 'theme-color', content: '#141313' },
        // og/twitter tags live in useShareMeta (one call per page) so every
        // page emits exactly one og:image with an absolute URL.
      ],
      link: [
        { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/favicon-512.png' },
      ],
      script: [
        {
          defer: true,
          'data-domain': 'bathong.africa',
          src: `${analyticsOrigin}/js/script.file-downloads.outbound-links.js`,
        },
        {
          innerHTML: "window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }",
        },
      ],
    },
  },
})

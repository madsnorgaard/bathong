// https://nuxt.com/docs/api/configuration/nuxt-config
const cmsUrl = process.env.NUXT_PUBLIC_CMS_URL || 'http://localhost:3001'

export default defineNuxtConfig({
  compatibilityDate: '2025-05-01',
  devtools: { enabled: false },
  modules: ['@nuxt/image', '@nuxt/fonts', '@nuxt/eslint'],
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
    domains: [new URL(cmsUrl).host],
    alias: { '/api/media': `${cmsUrl}/api/media` },
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
    // Baseline security headers. CSP is a follow-up (issue #37): a real one
    // needs nonces for SSR inline scripts, not unsafe-inline. COEP is
    // deliberately absent - nothing needs cross-origin isolation, and it
    // would force crossorigin attributes everywhere for zero gain.
    '/**': {
      headers: {
        'x-frame-options': 'DENY',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'permissions-policy': 'camera=(), microphone=(), geolocation=()',
        // Safe as same-origin: no cross-origin popups, and every subresource
        // is same-origin (ipx proxies api images, map tiles live in /map).
        'cross-origin-opener-policy': 'same-origin',
        'cross-origin-resource-policy': 'same-origin',
        'x-dns-prefetch-control': 'off',
      },
    },
    '/_ipx/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    // Self-hosted basemap extract; the filename is versioned (pta-inner-v1),
    // so it can cache forever. Route data itself rides on the walk document.
    '/map/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    '/share/**': { headers: { 'cache-control': 'public, max-age=86400' } },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Bathong. - Pretoria street photography collective',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'Bathong. A street photography collective working out of Pretoria.',
        },
        { name: 'theme-color', content: '#141313' },
        // og/twitter tags live in useShareMeta (one call per page) so every
        // page emits exactly one og:image with an absolute URL.
      ],
      link: [
        { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/favicon-512.png' },
      ],
    },
  },
})

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-01',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    // Server-only: internal container URL for SSR fetches (NUXT_CMS_INTERNAL_URL).
    cmsInternalUrl: process.env.NUXT_CMS_INTERNAL_URL || '',
    public: {
      // Public CMS base URL for the browser + media (NUXT_PUBLIC_CMS_URL).
      cmsUrl: process.env.NUXT_PUBLIC_CMS_URL || 'http://localhost:3001',
    },
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
        { property: 'og:title', content: 'Bathong.' },
        { property: 'og:type', content: 'website' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Grotesk:wght@400;500;700&family=Space+Mono:ital@0;1&display=swap',
        },
      ],
    },
  },
})

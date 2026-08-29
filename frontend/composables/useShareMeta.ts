interface ShareMetaInput {
  /** Page title without the site suffix, e.g. "Walks & sessions". Omit for the home page. */
  title?: string
  description: string
  /** Path or absolute URL of the 1200x630 JPEG share card. Defaults to the site card. */
  image?: string
  /** Describes the photograph on the card. */
  imageAlt?: string
  /** og:type, defaults to "website". Essays will pass "article". */
  type?: 'website' | 'article'
  /** Photographer credit for pages led by one photographer's work. */
  author?: string
}

const SITE_NAME = 'Bathong.'
const DEFAULT_IMAGE = '/share/default.jpg'
const DEFAULT_IMAGE_ALT =
  'A car raised on a workshop lift, a man walking past beneath it. Black and white street photograph.'

/**
 * Sets the full share meta block for a page: exactly one og:image, absolute
 * HTTPS URLs from runtimeConfig.public.siteUrl, twitter summary_large_image.
 * One call per page. Spec: design-system/design_handoff_frontend_v2/
 * design-references/share-cards.html, section 04.
 */
export function useShareMeta(input: ShareMetaInput) {
  const config = useRuntimeConfig()
  const route = useRoute()
  const siteUrl = config.public.siteUrl.replace(/\/$/, '')

  const absolute = (pathOrUrl: string) =>
    /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : `${siteUrl}${pathOrUrl}`

  const title = input.title
    ? `${input.title} - ${SITE_NAME}`
    : `${SITE_NAME} - Street and documentary photography, from Pretoria outward`
  const ogTitle = input.title ?? SITE_NAME
  const url = `${siteUrl}${route.path === '/' ? '/' : route.path}`
  const image = absolute(input.image ?? DEFAULT_IMAGE)
  // Alt always travels with the card (spec section 04) - a page-specific
  // description when given, the site card's description otherwise.
  const imageAlt = input.imageAlt ?? DEFAULT_IMAGE_ALT
  const copyright = input.author
    ? `© ${input.author} / Bathong. Collective`
    : '© Bathong. Collective'

  useHead({
    link: [{ rel: 'canonical', href: url }],
    meta: [{ content: copyright, name: 'copyright' }],
  })
  useSeoMeta({
    title,
    description: input.description,
    ogType: input.type ?? 'website',
    ogSiteName: SITE_NAME,
    ogLocale: 'en_ZA',
    ogTitle,
    ogDescription: input.description,
    ogUrl: url,
    ogImage: image,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageType: 'image/jpeg',
    ogImageAlt: imageAlt,
    twitterCard: 'summary_large_image',
    twitterTitle: ogTitle,
    twitterDescription: input.description,
    twitterImage: image,
    ...(input.author ? { articleAuthor: [input.author] } : {}),
  })
}

import type { CollectionBeforeValidateHook } from 'payload'

/**
 * A slug is one URL segment: lowercase ASCII letters, digits and hyphens.
 * Anything typed in the admin (spaces, slashes, accents, "walks/x/gallery")
 * is folded into that shape, and an empty slug is derived from the title,
 * so a saved document always has a URL the site can route.
 */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const formatSlug: CollectionBeforeValidateHook = ({ data, originalDoc }) => {
  if (!data) return data
  const typed = typeof data.slug === 'string' ? data.slug.trim() : ''
  if (typed) {
    data.slug = slugify(typed)
  } else if (!originalDoc?.slug && typeof data.title === 'string' && data.title.trim()) {
    data.slug = slugify(data.title)
  }
  return data
}

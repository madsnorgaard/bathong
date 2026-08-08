/**
 * Tiny CMS fetch wrapper.
 *
 * Server-side (SSR) it talks to the CMS over the internal container URL
 * (runtimeConfig.cmsInternalUrl); client-side it uses the public URL
 * (runtimeConfig.public.cmsUrl). Paths are relative, e.g. cms('/api/pages').
 *
 * Public content is fetched without credentials; pass { credentials: 'include' }
 * explicitly for authenticated calls so the Payload cookie is never sent by
 * accident. Absolute URLs are rejected: a caller-supplied full URL would
 * silently bypass baseURL and leak the request elsewhere.
 */
export function useCms() {
  const config = useRuntimeConfig()

  const baseURL = import.meta.server
    ? config.cmsInternalUrl || config.public.cmsUrl
    : config.public.cmsUrl

  function cms<T = unknown>(path: string, opts: Record<string, unknown> = {}) {
    if (!path.startsWith('/') || path.startsWith('//')) {
      throw new Error(`useCms: path must be relative, got "${path}"`)
    }
    return $fetch<T>(path, {
      baseURL,
      ...opts,
    })
  }

  return { cms, baseURL }
}

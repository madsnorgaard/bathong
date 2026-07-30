/**
 * Tiny CMS fetch wrapper.
 *
 * Server-side (SSR) it talks to the CMS over the internal container URL
 * (runtimeConfig.cmsInternalUrl); client-side it uses the public URL
 * (runtimeConfig.public.cmsUrl). Paths are relative, e.g. cms('/api/pages').
 */
export function useCms() {
  const config = useRuntimeConfig()

  const baseURL = import.meta.server
    ? config.cmsInternalUrl || config.public.cmsUrl
    : config.public.cmsUrl

  function cms<T = unknown>(path: string, opts: Record<string, unknown> = {}) {
    return $fetch<T>(path, {
      baseURL,
      credentials: 'include',
      ...opts,
    })
  }

  return { cms, baseURL }
}

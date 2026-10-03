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
import type { NitroFetchOptions } from 'nitropack'

/**
 * $fetch as the CMS calls use it: the caller names the response shape.
 * Nitro types $fetch against its own route table, which leaves the result
 * an unresolved conditional for a generic T; CMS paths are never Nitro
 * routes, so the response is plainly T.
 */
type CmsFetch = <T>(path: string, opts?: NitroFetchOptions<string>) => Promise<T>

export function useCms() {
  const config = useRuntimeConfig()

  const baseURL = import.meta.server
    ? config.cmsInternalUrl || config.public.cmsUrl
    : config.public.cmsUrl

  function cms<T = unknown>(path: string, opts: Record<string, unknown> = {}): Promise<T> {
    if (!path.startsWith('/') || path.startsWith('//')) {
      throw new Error(`useCms: path must be relative, got "${path}"`)
    }
    const request: CmsFetch = $fetch
    return request<T>(path, {
      baseURL,
      ...opts,
    })
  }

  return { cms, baseURL }
}

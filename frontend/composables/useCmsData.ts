/**
 * SSR-friendly CMS fetch: useAsyncData around useCms with a stable key so the
 * payload transfers to the client without a duplicate request.
 *
 *   const { data: walks } = await useCmsData<WalksResponse>('walks-upcoming',
 *     '/api/walks?where[date][greater_than]=2026-01-01')
 */
export function useCmsData<T = unknown>(
  key: string,
  path: string,
  opts: Record<string, unknown> = {},
) {
  const { cms } = useCms()
  return useAsyncData<T>(key, () => cms<T>(path, opts))
}

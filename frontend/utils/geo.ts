/**
 * GeoJSON helpers for the walk route map. The routeGeo field arrives untyped
 * from Payload; parseRouteGeo is the boundary — invalid shapes give null and
 * the page falls back to the written route. Nothing here ever throws.
 */

export type LngLat = [number, number]

export interface RouteLandmark {
  name: string
  kind: string | null
  lngLat: LngLat
}

export interface ParsedRoute {
  line: LngLat[]
  landmarks: RouteLandmark[]
}

export type RouteBounds = [LngLat, LngLat]

function asLngLat(value: unknown): LngLat | null {
  if (!Array.isArray(value) || value.length < 2) return null
  const [lng, lat] = value as unknown[]
  if (typeof lng !== 'number' || typeof lat !== 'number') return null
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null
  return [lng, lat]
}

/** First valid LineString becomes the route; named Points become landmarks. */
export function parseRouteGeo(raw: unknown): ParsedRoute | null {
  if (typeof raw !== 'object' || raw === null) return null
  const features = (raw as { features?: unknown }).features
  if (!Array.isArray(features)) return null

  let line: LngLat[] | null = null
  const landmarks: RouteLandmark[] = []

  for (const feature of features) {
    if (typeof feature !== 'object' || feature === null) continue
    const f = feature as {
      geometry?: { type?: unknown; coordinates?: unknown } | null
      properties?: { name?: unknown; kind?: unknown } | null
    }
    const geometry = f.geometry
    if (!geometry) continue

    if (geometry.type === 'LineString' && !line && Array.isArray(geometry.coordinates)) {
      const coords = geometry.coordinates.map(asLngLat)
      if (coords.length >= 2 && coords.every((c) => c !== null)) {
        line = coords as LngLat[]
      }
    } else if (geometry.type === 'Point') {
      const lngLat = asLngLat(geometry.coordinates)
      const name = f.properties?.name
      if (lngLat && typeof name === 'string' && name.length) {
        const kind = f.properties?.kind
        landmarks.push({ name, kind: typeof kind === 'string' ? kind : null, lngLat })
      }
    }
  }

  return line ? { line, landmarks } : null
}

/**
 * Bounding box of the line plus landmarks, padded by a fraction of the span
 * on each side (with a small floor so a short route still gets context).
 */
export function routeBounds(route: ParsedRoute, pad = 0): RouteBounds {
  const coords = [...route.line, ...route.landmarks.map((l) => l.lngLat)]
  let [minLng, minLat] = coords[0]
  let [maxLng, maxLat] = coords[0]
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  }
  const padLng = Math.max((maxLng - minLng) * pad, pad ? 0.0008 : 0)
  const padLat = Math.max((maxLat - minLat) * pad, pad ? 0.0008 : 0)
  return [
    [minLng - padLng, minLat - padLat],
    [maxLng + padLng, maxLat + padLat],
  ]
}

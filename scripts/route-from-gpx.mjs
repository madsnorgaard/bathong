#!/usr/bin/env node
/**
 * GPX -> routeGeo converter for walk routes.
 *
 * The precise route workflow (docs/ROUTES.md): record the walk with any GPS
 * app (OsmAnd, Organic Maps, Strava, a Garmin) or draw it in a tool that
 * exports GPX, then:
 *
 *   node scripts/route-from-gpx.mjs route.gpx > routegeo.json
 *
 * and paste the JSON into the walk's routeGeo field in the Payload admin.
 *
 * - <trkpt>/<rtept> points become the LineString (track preferred).
 * - <wpt> waypoints become landmark markers; a waypoint whose name contains
 *   "start" (any case) becomes the signal-dot start marker.
 * - The track is simplified (Douglas-Peucker, ~5 m tolerance) so a phone
 *   recording of thousands of fixes stays a small, clean line.
 * - Warns when the route leaves the self-hosted basemap extract, which means
 *   the tiles need re-extracting with a wider bbox (command printed).
 *
 * No dependencies on purpose; GPX is simple enough for a focused parser.
 */
import { readFileSync } from 'node:fs'

// Keep in sync with frontend/utils/map-style.ts TILES_BOUNDS.
const TILES_BOUNDS = { minLng: 28.155, minLat: -25.775, maxLng: 28.215, maxLat: -25.725 }
const SIMPLIFY_TOLERANCE_DEG = 0.00005 // ~5 m
const ROUND = 5 // ~1 m precision

const file = process.argv[2]
if (!file) {
  console.error('usage: node scripts/route-from-gpx.mjs <route.gpx> > routegeo.json')
  process.exit(1)
}
const gpx = readFileSync(file, 'utf8')

function pointsOf(tag) {
  const points = []
  const re = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)</${tag}>|<${tag}\\b([^>]*)/>`, 'g')
  for (const match of gpx.matchAll(re)) {
    const attrs = match[1] ?? match[3] ?? ''
    const body = match[2] ?? ''
    const lat = attrs.match(/lat="(-?[\d.]+)"/)?.[1]
    const lon = attrs.match(/lon="(-?[\d.]+)"/)?.[1]
    if (lat === undefined || lon === undefined) continue
    const name = body.match(/<name>([\s\S]*?)<\/name>/)?.[1]?.trim()
    points.push({ lng: Number(lon), lat: Number(lat), name })
  }
  return points
}

/** Douglas-Peucker on [lng, lat] pairs; tolerance in degrees. */
function simplify(coords, tolerance) {
  if (coords.length <= 2) return coords
  const sqDist = (p, a, b) => {
    let [x, y] = a
    let dx = b[0] - x
    let dy = b[1] - y
    if (dx !== 0 || dy !== 0) {
      const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy)
      if (t > 1) {
        x = b[0]
        y = b[1]
      } else if (t > 0) {
        x += dx * t
        y += dy * t
      }
    }
    dx = p[0] - x
    dy = p[1] - y
    return dx * dx + dy * dy
  }
  const keep = new Array(coords.length).fill(false)
  keep[0] = keep[coords.length - 1] = true
  const stack = [[0, coords.length - 1]]
  while (stack.length) {
    const [first, last] = stack.pop()
    let maxDist = 0
    let index = 0
    for (let i = first + 1; i < last; i++) {
      const d = sqDist(coords[i], coords[first], coords[last])
      if (d > maxDist) {
        maxDist = d
        index = i
      }
    }
    if (maxDist > tolerance * tolerance) {
      keep[index] = true
      stack.push([first, index], [index, last])
    }
  }
  return coords.filter((_, i) => keep[i])
}

const track = pointsOf('trkpt').length ? pointsOf('trkpt') : pointsOf('rtept')
if (track.length < 2) {
  console.error(`no <trkpt> or <rtept> track found in ${file}`)
  process.exit(1)
}
const round = (n) => Number(n.toFixed(ROUND))
const line = simplify(
  track.map((p) => [p.lng, p.lat]),
  SIMPLIFY_TOLERANCE_DEG,
).map(([lng, lat]) => [round(lng), round(lat)])

const landmarks = pointsOf('wpt')
  .filter((p) => p.name)
  .map((p) => ({
    type: 'Feature',
    properties: /start/i.test(p.name)
      ? { name: p.name.replace(/\s*\(?start\)?\s*/i, '').trim() || p.name, kind: 'start' }
      : { name: p.name },
    geometry: { type: 'Point', coordinates: [round(p.lng), round(p.lat)] },
  }))

const outside = line.filter(
  ([lng, lat]) =>
    lng < TILES_BOUNDS.minLng ||
    lng > TILES_BOUNDS.maxLng ||
    lat < TILES_BOUNDS.minLat ||
    lat > TILES_BOUNDS.maxLat,
)
if (outside.length) {
  console.error(
    `WARNING: ${outside.length} of ${line.length} route points fall outside the basemap extract` +
      ` (${TILES_BOUNDS.minLng},${TILES_BOUNDS.minLat} .. ${TILES_BOUNDS.maxLng},${TILES_BOUNDS.maxLat}).`,
  )
  console.error(
    'Re-extract wider tiles (bump the version, update TILES_KEY/TILES_PATH/TILES_BOUNDS in frontend/utils/map-style.ts):',
  )
  console.error(
    '  pmtiles extract https://build.protomaps.com/<latest>.pmtiles frontend/public/map/pta-inner-v2.pmtiles --bbox=<minLng>,<minLat>,<maxLng>,<maxLat>',
  )
}

console.error(`track: ${track.length} fixes -> ${line.length} points, ${landmarks.length} landmarks`)
console.log(
  JSON.stringify(
    {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { name: 'route' }, geometry: { type: 'LineString', coordinates: line } },
        ...landmarks,
      ],
    },
    null,
    2,
  ),
)

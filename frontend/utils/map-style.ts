/**
 * The basemap restyled to the darkroom. Geometry only — no symbol layers, so
 * no glyphs or sprites to self-host; landmark names are DOM markers set in
 * the site's own type. Hex values mirror assets/css/colors.css (WebGL cannot
 * read CSS custom properties). Tiles are a self-hosted Protomaps extract of
 * the inner city; nothing on this map talks to a third party.
 */
import type { LngLat, ParsedRoute } from '~/utils/geo'

export const TILES_KEY = 'pta-inner-v1'
export const TILES_PATH = '/map/pta-inner-v1.pmtiles'
/** Extract bbox (28.16,-25.77 → 28.21,-25.73) plus a sliver; panning stops where the tiles stop. */
export const TILES_BOUNDS: [LngLat, LngLat] = [
  [28.155, -25.775],
  [28.215, -25.725],
]

const INK = '#141313' /* --ink */
const BUILDING = '#201e1b' /* ink lifted toward paper */
const WATER = '#1c1b22'
const PARK = '#1a1823' /* a whisper of jacaranda in the ground */
const ROAD_MAJOR = '#4C493F' /* --grey-ink */
const ROAD_MINOR = '#33312c'
const ROAD_PATH = '#2a2925'
const RAIL = '#2f2d29'
const JACARANDA = '#7B5CD6' /* --jacaranda */

/**
 * line-gradient that reveals the route up to `progress` (0..1) of its length.
 * Driven per-frame for the draw-in; progress 1 is the fully drawn line.
 */
export function routeGradient(progress: number): unknown[] {
  const stop = Math.min(Math.max(progress, 1e-6), 1)
  return ['step', ['line-progress'], JACARANDA, stop, 'rgba(123, 92, 214, 0)']
}

/** Full MapLibre style: ink basemap plus the route. `drawn` skips the gradient (reduced motion). */
export function buildMapStyle(route: ParsedRoute, drawn: boolean): Record<string, unknown> {
  const roadWidth = (base: number) => [
    'interpolate',
    ['linear'],
    ['zoom'],
    12,
    base * 0.5,
    16,
    base * 2.2,
  ]
  return {
    version: 8,
    sources: {
      basemap: { type: 'vector', url: `pmtiles://${TILES_KEY}` },
      route: {
        type: 'geojson',
        lineMetrics: true,
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: route.line },
        },
      },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': INK } },
      {
        id: 'landuse-green',
        type: 'fill',
        source: 'basemap',
        'source-layer': 'landuse',
        filter: [
          'in',
          ['get', 'kind'],
          ['literal', ['park', 'garden', 'grass', 'cemetery', 'forest', 'pitch', 'sports_centre']],
        ],
        paint: { 'fill-color': PARK },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'basemap',
        'source-layer': 'water',
        paint: { 'fill-color': WATER },
      },
      {
        id: 'buildings',
        type: 'fill',
        source: 'basemap',
        'source-layer': 'buildings',
        paint: { 'fill-color': BUILDING },
      },
      {
        id: 'roads-rail',
        type: 'line',
        source: 'basemap',
        'source-layer': 'roads',
        filter: ['==', ['get', 'kind'], 'rail'],
        paint: { 'line-color': RAIL, 'line-width': 1, 'line-dasharray': [3, 3] },
      },
      {
        id: 'roads-path',
        type: 'line',
        source: 'basemap',
        'source-layer': 'roads',
        filter: ['==', ['get', 'kind'], 'path'],
        paint: { 'line-color': ROAD_PATH, 'line-width': 1 },
      },
      {
        id: 'roads-minor',
        type: 'line',
        source: 'basemap',
        'source-layer': 'roads',
        filter: ['in', ['get', 'kind'], ['literal', ['minor_road', 'other']]],
        paint: { 'line-color': ROAD_MINOR, 'line-width': roadWidth(1.4) },
      },
      {
        id: 'roads-medium',
        type: 'line',
        source: 'basemap',
        'source-layer': 'roads',
        filter: ['==', ['get', 'kind'], 'medium_road'],
        paint: { 'line-color': ROAD_MINOR, 'line-width': roadWidth(2) },
      },
      {
        id: 'roads-major',
        type: 'line',
        source: 'basemap',
        'source-layer': 'roads',
        filter: ['in', ['get', 'kind'], ['literal', ['major_road', 'highway']]],
        paint: { 'line-color': ROAD_MAJOR, 'line-width': roadWidth(3) },
      },
      {
        id: 'route-casing',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': INK, 'line-width': 9, 'line-opacity': 0.85 },
      },
      {
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: drawn
          ? { 'line-color': JACARANDA, 'line-width': 4 }
          : { 'line-color': JACARANDA, 'line-width': 4, 'line-gradient': routeGradient(0) },
      },
    ],
  }
}

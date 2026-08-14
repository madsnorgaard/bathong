<script setup lang="ts">
/**
 * The walk route on a self-hosted basemap: MapLibre + a small PMTiles extract
 * of the inner city, restyled to the darkroom. Everything heavy loads only
 * once the section scrolls near the viewport, so the walks page itself stays
 * light. Without JS (or WebGL, or a failed fetch) the figure is a readable
 * list of the route's landmarks. Nitro serves no Range requests, so the
 * extract is fetched whole (~1.3 MB, cached immutable) into an in-memory
 * pmtiles source. Attribution sits in the caption, visible in every state.
 */
import type { Map as MapLibreMap } from 'maplibre-gl'
// Vite bundles the worker (it imports maplibre-gl-shared.mjs relatively,
// which the browser could never resolve from our hashed chunk URLs) and
// hands back the emitted asset URL for setWorkerUrl below.
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { ParsedRoute } from '~/utils/geo'

const props = defineProps<{
  route: ParsedRoute
  meetingPoint?: string | null
}>()

const stage = ref<HTMLElement | null>(null)
const canvas = ref<HTMLElement | null>(null)
const live = ref(false)

const fallbackText = computed(() => {
  const names = props.route.landmarks.map((l) => l.name)
  return names.length ? names.join(' → ') : 'Route map'
})

let map: MapLibreMap | null = null
let raf = 0

onMounted(() => {
  if (!stage.value) return
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect()
        void init()
      }
    },
    { rootMargin: '200px' },
  )
  io.observe(stage.value)
  onBeforeUnmount(() => {
    io.disconnect()
    cancelAnimationFrame(raf)
    map?.remove()
    map = null
  })
})

async function init() {
  if (!canvas.value) return
  try {
    const [maplibreModule, pmtiles] = await Promise.all([
      import('maplibre-gl'),
      import('pmtiles'),
      import('maplibre-gl/dist/maplibre-gl.css'),
    ])
    // v6 ships pure named ESM exports; older builds hang them off default.
    const maplibregl = maplibreModule.default ?? maplibreModule

    const res = await fetch(TILES_PATH)
    if (!res.ok) throw new Error(`basemap fetch: ${res.status}`)
    const buffer = await res.arrayBuffer()
    const protocol = new pmtiles.Protocol()
    protocol.add(
      new pmtiles.PMTiles({
        getKey: () => TILES_KEY,
        getBytes: async (offset: number, length: number) => ({
          data: buffer.slice(offset, offset + length),
        }),
      }),
    )
    maplibregl.setWorkerUrl(maplibreWorkerUrl)
    maplibregl.addProtocol('pmtiles', protocol.tile)

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    map = new maplibregl.Map({
      container: canvas.value,
      style: buildMapStyle(props.route, reduced) as never,
      bounds: routeBounds(props.route, 0.18),
      fitBoundsOptions: { padding: 40 },
      maxBounds: TILES_BOUNDS,
      minZoom: 12,
      maxZoom: 16.5,
      attributionControl: false,
      cooperativeGestures: true,
      dragRotate: false,
      pitchWithRotate: false,
    })
    map.touchZoomRotate.disableRotation()

    for (const landmark of props.route.landmarks) {
      const el = document.createElement('div')
      el.className =
        landmark.kind === 'start' ? 'route-marker route-marker--start' : 'route-marker'
      const dot = document.createElement('span')
      dot.className = 'route-marker__dot'
      const name = document.createElement('span')
      name.className = 'route-marker__name'
      name.textContent = landmark.name
      el.append(dot, name)
      new maplibregl.Marker({ element: el }).setLngLat(landmark.lngLat).addTo(map)
    }

    map.on('load', () => {
      live.value = true
      if (!reduced) animate()
    })
  } catch (err) {
    // No WebGL, or the extract failed to load: the landmark list stays.
    console.error('[route-map] falling back to the landmark list:', err)
    map?.remove()
    map = null
  }
}

/** Draw the jacaranda line over ~1.6s by stepping the line-gradient. */
function animate() {
  const started = performance.now()
  const tick = (now: number) => {
    const t = Math.min(1, (now - started) / 1600)
    const eased = 1 - (1 - t) ** 3
    map?.setPaintProperty('route-line', 'line-gradient', routeGradient(eased) as never)
    if (t < 1) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
}
</script>

<template>
  <figure class="route-map">
    <div ref="stage" class="route-map__stage">
      <div ref="canvas" class="route-map__canvas" />
      <p v-if="!live" class="route-map__fallback b-caption">{{ fallbackText }}</p>
    </div>
    <figcaption class="route-map__caption b-caption">
      <span v-if="meetingPoint">Meet at {{ meetingPoint }}</span>
      <span>Map data © OpenStreetMap contributors · Protomaps</span>
    </figcaption>
  </figure>
</template>

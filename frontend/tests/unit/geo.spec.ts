import { describe, it, expect } from 'vitest'
import { parseRouteGeo, routeBounds } from '~/utils/geo'

const line = (coordinates: unknown) => ({
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates },
})
const point = (coordinates: unknown, properties: Record<string, unknown> = {}) => ({
  type: 'Feature',
  properties,
  geometry: { type: 'Point', coordinates },
})
const fc = (features: unknown[]) => ({ type: 'FeatureCollection', features })

describe('parseRouteGeo (the untyped-field boundary)', () => {
  it('parses a route with landmarks', () => {
    const route = parseRouteGeo(
      fc([
        line([
          [28.188, -25.746],
          [28.19, -25.744],
          [28.192, -25.746],
        ]),
        point([28.188, -25.746], { name: 'Church Square', kind: 'start' }),
        point([28.19, -25.744], { name: 'Home Affairs' }),
      ]),
    )
    expect(route).not.toBeNull()
    expect(route!.line).toHaveLength(3)
    expect(route!.landmarks.map((l) => l.name)).toEqual(['Church Square', 'Home Affairs'])
    expect(route!.landmarks[0].kind).toBe('start')
    expect(route!.landmarks[1].kind).toBeNull()
  })

  it('never throws on garbage, it returns null', () => {
    expect(parseRouteGeo(null)).toBeNull()
    expect(parseRouteGeo(undefined)).toBeNull()
    expect(parseRouteGeo('a string')).toBeNull()
    expect(parseRouteGeo(42)).toBeNull()
    expect(parseRouteGeo({})).toBeNull()
    expect(parseRouteGeo({ features: 'nope' })).toBeNull()
    expect(parseRouteGeo(fc([{ geometry: null }, 7, 'x']))).toBeNull()
  })

  it('rejects a route without a valid line', () => {
    // one point is not a line
    expect(parseRouteGeo(fc([line([[28.188, -25.746]])]))).toBeNull()
    // out-of-range or malformed coordinates poison the line
    expect(
      parseRouteGeo(
        fc([
          line([
            [281.88, -25.746],
            [28.19, -25.744],
          ]),
        ]),
      ),
    ).toBeNull()
    expect(
      parseRouteGeo(
        fc([
          line([
            [28.188, -25.746],
            ['x', -25.744],
          ]),
        ]),
      ),
    ).toBeNull()
  })

  it('skips unnamed or malformed points without losing the route', () => {
    const route = parseRouteGeo(
      fc([
        line([
          [28.188, -25.746],
          [28.19, -25.744],
        ]),
        point([28.189, -25.745]), // no name
        point([999, -25.745], { name: 'Nowhere' }), // bad coords
      ]),
    )
    expect(route).not.toBeNull()
    expect(route!.landmarks).toHaveLength(0)
  })
})

describe('routeBounds', () => {
  const route = parseRouteGeo(
    fc([
      line([
        [28.188, -25.746],
        [28.192, -25.742],
      ]),
      point([28.194, -25.744], { name: 'East marker' }),
    ]),
  )!

  it('covers the line and the landmarks', () => {
    const [[minLng, minLat], [maxLng, maxLat]] = routeBounds(route)
    expect(minLng).toBe(28.188)
    expect(maxLng).toBe(28.194) // the landmark extends the box
    expect(minLat).toBe(-25.746)
    expect(maxLat).toBe(-25.742)
  })

  it('pads by a fraction of the span', () => {
    const [[minLng]] = routeBounds(route, 0.5)
    expect(minLng).toBeLessThan(28.188)
  })
})

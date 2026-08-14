# Walk routes: from Jacques' head to the map

The map on /walks draws whatever sits in the walk's `routeGeo` field in the
Payload admin (Programme -> Walks -> the walk). Changing a route is a content
edit; no deploy, no developer. This doc is the workflow for getting a route
in there *precisely*, so nobody ever has to trace a screenshot again.

The field wants GeoJSON: a FeatureCollection with one LineString (the route,
`[lng, lat]` pairs, longitude first) and optional Point features whose `name`
becomes a marker label. A point with `"kind": "start"` gets the yellow
signal dot; use it for the meeting point. The admin refuses to save anything
that is not a valid line, and the site quietly falls back to the written
route text if the data is missing.

## Option A - walk it (most precise)

1. Record the actual route with any GPS app that exports GPX: OsmAnd,
   Organic Maps, Strava, a Garmin. Do the recce walk you were doing anyway.
2. Add waypoints at the landmarks you want labelled; name one of them
   "Something (start)" for the meeting point.
3. Export the GPX and convert it:

   ```bash
   node scripts/route-from-gpx.mjs route.gpx > routegeo.json
   ```

   The script simplifies the phone's thousands of fixes to a clean line
   (about 5 m tolerance), turns waypoints into markers, and warns if the
   route leaves the basemap extract (see below).
4. Paste the JSON into the walk's `routeGeo` field. Done.

## Option B - draw it

1. Open [geojson.io](https://geojson.io). The satellite/OSM basemap is
   accurate enough to snap a line to real streets by hand.
2. Draw one line for the route, add points for landmarks, and set each
   point's `name` property (and `kind: start` on the meeting point) in the
   table on the left.
3. Copy the GeoJSON from the right-hand panel straight into `routeGeo`.
   (geojson.io already outputs `[lng, lat]`; if a map ever shows the route
   in the ocean, latitude and longitude got swapped.)

## The basemap extract

Tiles are self-hosted (`frontend/public/map/pta-inner-v1.pmtiles`, about
1.3 MB) and cover the inner city: 28.16,-25.77 to 28.21,-25.73, which
includes Church Square, Marabastad, Salvokop and Sunnyside's edge. Routes
inside that box need nothing. If a walk goes further afield, the converter
script prints a warning plus the `pmtiles extract` command to cut a wider
box; bump the filename version (`-v2`) and update `TILES_KEY`, `TILES_PATH`
and `TILES_BOUNDS` in `frontend/utils/map-style.ts`.

## House rules

- The walk's written `route` text stays the source people read; the map is
  the picture of it. Keep them telling the same story.
- Jacques owns routes (brand/BRIEF.md). A route on the site without Jacques'
  sign-off says so in the route text, like Walk 001 did while it was a
  draft.
- Landmarks are labels, not pins to tap: three or four earn their place,
  ten is clutter.

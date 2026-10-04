/**
 * Share-card renderer: C2 essay, C3 photographer, C4 walk, C5 photocall,
 * and the C1-structure photograph cards the index pages and the record of a
 * walk or workshop share.
 * Layouts transcribed from the spec artboards in
 * design-system/design_handoff_frontend_v2/design-references/share-cards.html
 * (and design-system/assets/share/exports.html for the shared furniture).
 *
 * satori sets the type (fonts passed as buffers, no system fontconfig),
 * resvg rasterises, sharp lays the photograph under the overlay and encodes
 * JPEG q82, stepping quality down if a card breaches the 300 KB WhatsApp
 * ceiling. Every failure path serves the static C1 default instead - a
 * crawler must never see a broken card.
 */
import { Resvg } from '@resvg/resvg-js'
import satori from 'satori'
import sharp from 'sharp'
import type { OverlayOptions, Sharp } from 'sharp'
import { isPastWalk } from '../../utils/walks'

export const CARD_W = 1200
export const CARD_H = 630
const BAR_H = 120
const RULE = 4
const SIZE_CEILING = 300 * 1024

// tokens (tokens/tokens.css)
const INK = '#141313'
const PAPER = '#F2EEE6'
const JACARANDA = '#7B5CD6'
const JACARANDA_DEEP = '#5636B8'
const SIGNAL = '#E8FF38'
const GREY_GHOST = '#A09B90'
const GREY_FOG = '#CFCABF'

type Node = { props: Record<string, unknown>; type: string }
const el = (
  type: string,
  style: Record<string, unknown>,
  children?: Array<Node | string> | Node | string,
): Node => ({ type, props: { style, ...(children != null ? { children } : {}) } })

const mono = (
  text: string,
  size: number,
  track: number,
  color: string,
  extra: Record<string, unknown> = {},
) =>
  el(
    'div',
    {
      color,
      fontFamily: 'Space Mono',
      fontSize: size,
      letterSpacing: `${size * track}px`,
      textTransform: 'uppercase',
      ...extra,
    },
    text,
  )

const display = (
  lines: string[],
  size: number,
  color: string,
  extra: Record<string, unknown> = {},
) =>
  el(
    'div',
    { display: 'flex', flexDirection: 'column', ...extra },
    lines.map((l) =>
      el(
        'div',
        {
          color,
          fontFamily: 'Archivo Black',
          fontSize: size,
          letterSpacing: `${size * -0.035}px`,
          lineHeight: 0.98,
          textTransform: 'uppercase',
        },
        l,
      ),
    ),
  )

/** The wordmark. Live type, never an image - same rule as the site. */
const wordmark = (size: number, color = PAPER, dot = JACARANDA) =>
  el('div', { alignItems: 'baseline', display: 'flex' }, [
    el(
      'div',
      {
        color,
        fontFamily: 'Archivo Black',
        fontSize: size,
        letterSpacing: `${size * -0.035}px`,
        lineHeight: 1,
      },
      'BATHONG',
    ),
    el(
      'div',
      { color: dot, fontFamily: 'Archivo Black', fontSize: size, lineHeight: 1 },
      '.',
    ),
  ])

/** Credit chip, bottom-left on the photograph. Credit always travels. */
const creditChip = (text: string, bottom: number) =>
  el(
    'div',
    {
      backgroundColor: INK,
      bottom,
      color: GREY_FOG,
      display: 'flex',
      fontFamily: 'Space Mono',
      fontSize: 18,
      left: 0,
      letterSpacing: `${18 * 0.12}px`,
      padding: '12px 20px',
      position: 'absolute',
      textTransform: 'uppercase',
    },
    text,
  )

/** Ink bar with the 4px jacaranda rule, wordmark left, mono meta right. */
const inkBar = (metaLines: string[], wmSize = 34, ruleColor = JACARANDA) =>
  el(
    'div',
    {
      alignItems: 'center',
      backgroundColor: INK,
      borderTop: `${RULE}px solid ${ruleColor}`,
      display: 'flex',
      height: BAR_H + RULE,
      justifyContent: 'space-between',
      padding: '26px 40px',
      width: CARD_W,
    },
    [
      wordmark(wmSize),
      el(
        'div',
        { alignItems: 'flex-end', display: 'flex', flexDirection: 'column' },
        metaLines.map((l) => mono(l, 19, 0.16, GREY_GHOST, { lineHeight: 1.7, textAlign: 'right' })),
      ),
    ],
  )

const root = (children: Array<Node>, background = 'transparent') =>
  el('div', {
    backgroundColor: background,
    display: 'flex',
    flexDirection: 'column',
    height: CARD_H,
    position: 'relative',
    width: CARD_W,
  }, children) as never

// ---- overlays per template --------------------------------------------------

/** C2 essay / C1 structure: transparent photo area, credit chip, bar. */
export const essayOverlay = (args: { credit: string | null; metaLines: string[] }) =>
  root([
    el('div', { display: 'flex', flex: 1, position: 'relative' },
      args.credit ? [creditChip(args.credit, 0)] : []),
    inkBar(args.metaLines),
  ])

/** C3 photographer: portrait left 470px with vertical rule, type right. */
export const photographerOverlay = (args: {
  metaTop: string
  nameLines: string[]
  metaBottom: string[]
}) =>
  root([
    el('div', { display: 'flex', flexDirection: 'row', height: CARD_H, width: CARD_W }, [
      el('div', {
        borderRight: `${RULE}px solid ${JACARANDA}`,
        display: 'flex',
        height: CARD_H,
        width: 470,
      }),
      el(
        'div',
        {
          backgroundColor: INK,
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 46px',
        },
        [
          mono(args.metaTop, 19, 0.18, GREY_GHOST),
          display(args.nameLines, 62, PAPER),
          el(
            'div',
            { display: 'flex', flexDirection: 'column' },
            args.metaBottom.map((l) => mono(l, 17, 0.14, GREY_GHOST, { lineHeight: 1.9 })),
          ),
        ],
      ),
    ]),
  ])

/** C4 walk: full jacaranda plate, the date enormous. Launch-only state. */
export const walkPlate = (args: {
  topLine: string
  dateLines: string[]
  bottomLine: string
  // The ink bar's two lines; the walk pair is the default so every existing
  // walk card stays byte-identical.
  barLines?: string[]
}) =>
  root(
    [
      el(
        'div',
        {
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 50px',
        },
        [
          mono(args.topLine, 20, 0.2, 'rgba(242,238,230,.8)'),
          display(args.dateLines, 88, PAPER),
          mono(args.bottomLine, 20, 0.14, PAPER),
        ],
      ),
      inkBar(args.barLines ?? ['BRING ONE LENS', 'BATHONG.AFRICA/WALKS'], 34, INK),
    ],
    JACARANDA,
  )

/**
 * Workshop with an invite: the whole poster contained left (a designed
 * thing is never cropped), the jacaranda plate right, C3's split language.
 */
export const workshopInviteOverlay = (args: {
  topLine: string
  dateLines: string[]
  bottomLine: string
  metaLine: string
}) =>
  root([
    el('div', { display: 'flex', flexDirection: 'row', height: CARD_H, width: CARD_W }, [
      el('div', {
        borderRight: `${RULE}px solid ${JACARANDA}`,
        display: 'flex',
        height: CARD_H,
        width: 640,
      }),
      el(
        'div',
        {
          backgroundColor: JACARANDA,
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '50px 44px',
        },
        [
          mono(args.topLine, 19, 0.18, 'rgba(242,238,230,.8)'),
          display(args.dateLines, 60, PAPER),
          el('div', { display: 'flex', flexDirection: 'column' }, [
            mono(args.bottomLine, 18, 0.14, PAPER, { lineHeight: 1.9 }),
            mono(args.metaLine, 15, 0.14, 'rgba(242,238,230,.8)', { lineHeight: 1.9 }),
          ]),
        ],
      ),
    ]),
  ])

/** C5 photocall: photo top third, signal plate carrying status + title. */
export const photocallOverlay = (args: {
  credit: string | null
  statusLine: string
  title: string
}) =>
  root([
    el('div', { display: 'flex', height: 380, position: 'relative', width: CARD_W },
      args.credit ? [creditChip(args.credit, 0)] : []),
    el(
      'div',
      {
        alignItems: 'center',
        backgroundColor: SIGNAL,
        borderTop: `${RULE}px solid ${INK}`,
        display: 'flex',
        flex: 1,
        justifyContent: 'space-between',
        padding: '36px 46px',
      },
      [
        el('div', { display: 'flex', flexDirection: 'column' }, [
          mono(args.statusLine, 18, 0.2, INK, { marginBottom: 10 }),
          display([args.title], 56, INK),
        ]),
        wordmark(34, INK, JACARANDA_DEEP),
      ],
    ),
  ])

// ---- rendering --------------------------------------------------------------

let fontsPromise: Promise<{ data: ArrayBuffer; name: string; weight: 400 | 700 }[]> | null = null

const loadFonts = () => {
  if (!fontsPromise) {
    fontsPromise = (async () => {
      const storage = useStorage('assets:server')
      const read = async (key: string) => {
        const raw = await storage.getItemRaw<Buffer<ArrayBuffer> | Uint8Array<ArrayBuffer>>(key)
        if (!raw) throw new Error(`server asset missing: ${key}`)
        const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw)
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
      }
      return [
        { data: await read('fonts/ArchivoBlack-Regular.ttf'), name: 'Archivo Black', weight: 400 as const },
        { data: await read('fonts/SpaceMono-Regular.ttf'), name: 'Space Mono', weight: 400 as const },
        { data: await read('fonts/SpaceMono-Bold.ttf'), name: 'Space Mono', weight: 700 as const },
      ]
    })().catch((err) => {
      fontsPromise = null
      throw err
    })
  }
  return fontsPromise
}

export async function renderOverlay(node: never): Promise<Buffer> {
  const svg = await satori(node, { fonts: await loadFonts(), height: CARD_H, width: CARD_W })
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: CARD_W } }).render().asPng()
  return Buffer.from(png)
}

/** JPEG q82, stepping down until under the 300 KB WhatsApp ceiling. */
export async function encodeCard(pipeline: Sharp): Promise<Buffer> {
  // Explicit intermediate format: a created image without one outputs raw
  // pixel data that the encode pass cannot identify.
  const base = await pipeline.png().toBuffer()
  for (const quality of [82, 72, 64]) {
    const out = await sharp(base).jpeg({ mozjpeg: true, quality }).toBuffer()
    if (out.length <= SIZE_CEILING) return out
  }
  return sharp(base).jpeg({ mozjpeg: true, quality: 56 }).toBuffer()
}

/** Compose photo (cover-fit into a region) under a full-card overlay PNG. */
export async function composeCard(args: {
  overlay: Buffer
  photo?: {
    buffer: Buffer
    height: number
    left: number
    top: number
    width: number
    // 'contain' letterboxes on ink instead of cropping: for designed images
    // (an invite poster) that must arrive whole. Photographs stay 'cover'.
    fit?: 'cover' | 'contain'
  }
}): Promise<Buffer> {
  const layers: OverlayOptions[] = []
  if (args.photo) {
    const fitted = await sharp(args.photo.buffer)
      .flatten({ background: INK })
      .resize(args.photo.width, args.photo.height, {
        fit: args.photo.fit ?? 'cover',
        position: 'centre',
        background: INK,
      })
      .toBuffer()
    layers.push({ input: fitted, left: args.photo.left, top: args.photo.top })
  }
  layers.push({ input: args.overlay, left: 0, top: 0 })
  const card = sharp({
    create: { background: INK, channels: 3, height: CARD_H, width: CARD_W },
  }).composite(layers)
  return encodeCard(card)
}

// ---- data + delivery helpers ------------------------------------------------

/** CMS fetch from the server: internal container URL when configured. */
export function cmsOrigin(): { fetchBase: string; publicBase: string } {
  const config = useRuntimeConfig()
  const publicBase = (config.public.cmsUrl as string).replace(/\/$/, '')
  const internal = (config.cmsInternalUrl as string) || ''
  return { fetchBase: internal.replace(/\/$/, '') || publicBase, publicBase }
}

export async function cmsGet<T>(path: string): Promise<T> {
  const { fetchBase } = cmsOrigin()
  // Nitro types $fetch against its own route table, which leaves the result
  // an unresolved conditional for a generic T. A CMS URL is never a Nitro
  // route, so the response is plainly T.
  const get: <R>(url: string) => Promise<R> = $fetch
  return get<T>(`${fetchBase}${path}`)
}

/** Fetch a media file; API URLs are public-origin, rewritten to internal. */
export async function fetchPhoto(url: string): Promise<Buffer> {
  const { fetchBase, publicBase } = cmsOrigin()
  const target = url.startsWith('/')
    ? `${fetchBase}${url}`
    : url.replace(publicBase, fetchBase)
  const res = await $fetch.raw(target, { responseType: 'arrayBuffer' })
  return Buffer.from(res._data as ArrayBuffer)
}

interface MediaLike {
  credit?: string | null
  sizes?: { feature?: { url?: string | null }; hero?: { url?: string | null }; og?: { url?: string | null } }
  url?: string | null
}

/** Best available source for a card photo: og, then feature, then original. */
export const bestPhotoUrl = (media: MediaLike | null | undefined): string | null =>
  media?.sizes?.og?.url ?? media?.sizes?.feature?.url ?? media?.url ?? null

let defaultBytes: Buffer | null = null
export async function defaultCardBytes(): Promise<Buffer> {
  if (!defaultBytes) {
    const raw = await useStorage('assets:server').getItemRaw('share-default.jpg')
    if (!raw) throw new Error('share-default.jpg missing from server assets')
    defaultBytes = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as Uint8Array)
  }
  return defaultBytes
}

const cache = new Map<string, { buf: Buffer; exp: number }>()
const CACHE_TTL = 60 * 60 * 1000
const CACHE_MAX = 200

/**
 * Serve a card: cached render keyed on name+version, default bytes on any
 * failure. Cache-control matches the /share/** route rule.
 */
export async function serveCard(
  event: Parameters<typeof setHeader>[0],
  key: string,
  render: () => Promise<Buffer | null>,
): Promise<Buffer> {
  setHeader(event, 'content-type', 'image/jpeg')
  setHeader(event, 'cache-control', 'public, max-age=86400')
  const hit = cache.get(key)
  if (hit && hit.exp > Date.now()) return hit.buf
  let buf: Buffer | null = null
  try {
    buf = await render()
  } catch (err) {
    console.error(`[share-cards] ${key} failed, serving default:`, err)
  }
  if (!buf) return defaultCardBytes()
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }
  cache.set(key, { buf, exp: Date.now() + CACHE_TTL })
  return buf
}

export const pad3 = (n: number) => String(n).padStart(3, '0')
export const pad4 = (n: number) => String(n).padStart(4, '0')

const TZ = 'Africa/Johannesburg'
export const fmtDate = (iso: string) => {
  const d = new Date(iso)
  const part = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-ZA', { timeZone: TZ, ...opts }).format(d)
  return {
    dayMonth: `${part({ day: 'numeric' })} ${part({ month: 'long' })}`,
    shortDayMonth: `${part({ day: 'numeric' })} ${part({ month: 'short' })}`,
    time: part({ hour: '2-digit', hour12: false, minute: '2-digit' }),
    weekday: part({ weekday: 'long' }),
  }
}

// ---- photographs for cards ---------------------------------------------------

/** A photograph and the name that travels with it. */
export interface CreditedPhoto {
  credit: string | null
  url: string
}

type PersonRef = { name?: string | null } | number | null

export interface FrameLike {
  creditOverride?: string | null
  image?: MediaLike | number | null
  photographer?: PersonRef
}

export interface AlbumLike {
  creditOverride?: string | null
  images?: Array<MediaLike | number> | null
  photographer?: PersonRef
}

const personName = (p: PersonRef | undefined) => (p && typeof p === 'object' ? (p.name ?? null) : null)

/** A frame's photograph, credited by the frame's own rule. */
export function framePhoto(frame: FrameLike | number | null | undefined): CreditedPhoto | null {
  if (!frame || typeof frame !== 'object') return null
  const url = bestPhotoUrl(typeof frame.image === 'object' ? frame.image : null)
  if (!url) return null
  return { credit: frame.creditOverride ?? personName(frame.photographer), url }
}

/**
 * An album's cover: its first photograph, credited to that file's own
 * credit when it carries one, else the album's (the album page's rule).
 */
export function albumPhoto(album: AlbumLike | null | undefined): CreditedPhoto | null {
  const first = album?.images?.[0]
  const media = first && typeof first === 'object' ? first : null
  const url = bestPhotoUrl(media)
  if (!album || !url) return null
  return {
    credit: media?.credit?.trim() || album.creditOverride || personName(album.photographer),
    url,
  }
}

/**
 * The photograph that stands for a walked walk or a held workshop: the lead
 * frame of its newest essay, else its newest frame, else the cover of its
 * newest album. Null while it has produced nothing yet.
 */
export async function recordPhoto(
  kind: 'walks' | 'workshops',
  id: number,
): Promise<CreditedPhoto | null> {
  if (kind === 'walks') {
    const essays = await cmsGet<{ docs: Array<{ leadFrame?: FrameLike | number | null }> }>(
      `/api/essays?where[walks][contains]=${id}&sort=-publishedDate&limit=1&depth=2`,
    )
    const lead = framePhoto(essays.docs[0]?.leadFrame)
    if (lead) return lead
    const frames = await cmsGet<{ docs: FrameLike[] }>(
      `/api/frames?where[walk][equals]=${id}&sort=-createdAt&limit=1&depth=1`,
    )
    const frame = framePhoto(frames.docs[0])
    if (frame) return frame
  }
  const albums = await cmsGet<{ docs: AlbumLike[] }>(
    `/api/albums?where[${kind}][contains]=${id}&sort=-date&limit=1&depth=1`,
  )
  return albumPhoto(albums.docs[0])
}

/** A bar line, uppercased and clipped so it never runs into the wordmark. */
export const barLine = (text: string, max = 46) => {
  const t = text.toUpperCase()
  return t.length > max ? `${t.slice(0, max - 3).trimEnd()}...` : t
}

/** The C1/C2 structure: the photograph, its credit chip, the ink bar. */
export async function photoCard(args: { metaLines: string[]; photo: CreditedPhoto }): Promise<Buffer> {
  const overlay = await renderOverlay(
    essayOverlay({
      credit: args.photo.credit ? `© ${args.photo.credit}` : null,
      metaLines: args.metaLines,
    }) as never,
  )
  return composeCard({
    overlay,
    photo: {
      buffer: await fetchPhoto(args.photo.url),
      height: CARD_H - BAR_H - RULE,
      left: 0,
      top: 0,
      width: CARD_W,
    },
  })
}

// ---- walk + workshop cards (one walk's page and the index share them) --------

export interface WalkCardDoc {
  date: string
  endTime?: string | null
  id: number
  meetingPoint?: string | null
  number?: number | null
  priceMember?: number | null
  title: string
}

/**
 * C4 for one walk. Upcoming: the jacaranda plate, the date enormous. Walked:
 * a photograph from the walk on the C1 structure, as the spec asks once a
 * walk has frames; the plate (when allowed) only while it has none.
 */
export async function walkCard(walk: WalkCardDoc, allowPlate = true): Promise<Buffer | null> {
  const past = isPastWalk(walk)
  const d = fmtDate(walk.date)
  const no = `WALK № ${pad3(walk.number ?? 1)}`
  if (past) {
    const photo = await recordPhoto('walks', walk.id)
    if (photo) {
      return photoCard({
        metaLines: [`${no} · WALKED ${d.shortDayMonth.toUpperCase()}`, barLine(walk.title)],
        photo,
      })
    }
    if (!allowPlate) return null
  }
  const suffix = past ? ' · WALKED' : walk.priceMember === 0 ? ' · FREE FOR MEMBERS' : ''
  const overlay = await renderOverlay(
    walkPlate({
      topLine: `${no}${suffix}`,
      dateLines: [d.weekday.toUpperCase(), d.dayMonth.toUpperCase(), d.time],
      bottomLine: (walk.meetingPoint ?? walk.title).toUpperCase(),
    }) as never,
  )
  return composeCard({ overlay })
}

export interface WorkshopCardDoc {
  date: string
  endTime?: string | null
  heroImage?: { url?: string | null } | number | null
  id: number
  number?: number | null
  title: string
  venueName?: string | null
}

/**
 * The card for one workshop. With an invite (heroImage), the whole poster
 * sits contained on the left and the jacaranda plate carries the facts on
 * the right, the C3 split language. Without one, a held workshop leads with
 * a photograph from its albums; the type plate (when allowed) is what is
 * left.
 */
export async function workshopCard(
  workshop: WorkshopCardDoc,
  allowPlate = true,
): Promise<Buffer | null> {
  const past = isPastWalk(workshop)
  const d = fmtDate(workshop.date)
  const no = `WORKSHOP № ${pad3(workshop.number ?? 1)}`
  const topLine = `${no}${past ? ' · HELD' : ''}`
  const dateLines = [d.weekday.toUpperCase(), d.dayMonth.toUpperCase(), d.time]
  const bottomLine = (workshop.venueName ?? workshop.title).toUpperCase()

  // The invite is the original file, never a crop: og/feature sizes are
  // cover crops that would slice a designed poster.
  const invite = typeof workshop.heroImage === 'object' ? workshop.heroImage?.url : null
  if (invite) {
    const overlay = await renderOverlay(
      workshopInviteOverlay({
        topLine,
        dateLines,
        bottomLine,
        metaLine: 'BATHONG.AFRICA/WORKSHOPS',
      }) as never,
    )
    return composeCard({
      overlay,
      photo: { buffer: await fetchPhoto(invite), height: CARD_H, left: 0, top: 0, width: 640, fit: 'contain' },
    })
  }

  if (past) {
    const photo = await recordPhoto('workshops', workshop.id)
    if (photo) {
      return photoCard({
        metaLines: [`${no} · HELD ${d.shortDayMonth.toUpperCase()}`, barLine(workshop.title)],
        photo,
      })
    }
    if (!allowPlate) return null
  }

  const overlay = await renderOverlay(
    walkPlate({
      topLine,
      dateLines,
      bottomLine,
      barLines: ['BOOK ON THE WEBSITE', 'BATHONG.AFRICA/WORKSHOPS'],
    }) as never,
  )
  return composeCard({ overlay })
}

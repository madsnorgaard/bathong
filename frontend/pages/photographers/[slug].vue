<script setup lang="ts">
/**
 * The photographer page (W4): a photographer's front page, hosted by us.
 * Count row with real numbers only or it does not render. Essays first,
 * then the newest frames as a staggered run where every frame opens, the
 * member's albums, the exhibitions that hang their frames, and the workshops
 * they facilitated on paper. The copyright line is a jacaranda plate, on the
 * record.
 */
import type { Person, Essay, Frame, Album, Media, Workshop, Exhibition, SiteSetting } from '~/types/payload-types'

const route = useRoute()
const slug = route.params.slug as string

interface List<T> { docs: T[]; totalDocs: number }

const { data: personData } = await useCmsData<List<Person>>(
  `person-${slug}`,
  `/api/people?where[slug][equals]=${encodeURIComponent(slug)}&depth=1&limit=1`,
)
const person = computed(() => personData.value?.docs?.[0] ?? null)

if (!person.value) {
  throw createError({ statusCode: 404, statusMessage: 'Photographer not found', fatal: true })
}

const personId = person.value.id
const [
  { data: essaysData },
  { data: framesData },
  { data: albumsData },
  { data: workshopsData },
  { data: walksData },
  { data: exhibitionsData },
  { data: settings },
] = await Promise.all([
  useCmsData<List<Essay>>(
    `person-essays-${slug}`,
    `/api/essays?where[contributors][contains]=${personId}&sort=-publishedDate&limit=12&depth=2`,
  ),
  useCmsData<List<Frame>>(
    `person-frames-${slug}`,
    `/api/frames?where[photographer][equals]=${personId}&sort=-createdAt&limit=12&depth=1`,
  ),
  // depth 1 so the cover arrives as Media; anonymous readers get published albums only
  useCmsData<List<Album>>(
    `person-albums-${slug}`,
    `/api/albums?where[photographer][equals]=${personId}&sort=-date&limit=12&depth=1`,
  ),
  useCmsData<List<Workshop>>(
    `person-workshops-${slug}`,
    `/api/workshops?where[facilitators][contains]=${personId}&sort=-date&limit=24&depth=0&joins[albums]=false`,
  ),
  // only the total is read: one doc, no joins
  useCmsData<List<unknown>>(
    `person-walks-${slug}`,
    `/api/walks?where[leaders][contains]=${personId}&limit=1&depth=0&joins[essays]=false&joins[frames]=false&joins[albums]=false`,
  ),
  // the walls that hang this member's frames; published only for anonymous readers
  useCmsData<List<Exhibition>>(
    `person-exhibitions-${slug}`,
    photographerExhibitionsQuery(personId, 12),
  ),
  useCmsData<SiteSetting>('site-settings', '/api/globals/site-settings'),
])

const essays = computed(() => essaysData.value?.docs ?? [])
// Restricted media (a photocall entry still under judging) populates as an
// id for anonymous readers; a frame without a picture is not shown.
const frames = computed(() =>
  (framesData.value?.docs ?? []).filter((f) => Boolean(mediaSrc(f.image as never))),
)
const framesTotal = computed(() => framesData.value?.totalDocs ?? 0)
const albums = computed(() => albumsData.value?.docs ?? [])
const workshops = computed(() => workshopsData.value?.docs ?? [])
// One clock for server and browser, so "on now" cannot change under hydration.
const wallNow = useState('exhibitions-now', () => Date.now())
const exhibitions = computed(() =>
  (exhibitionsData.value?.docs ?? []).map((doc) => ({
    doc,
    phase: exhibitionPhaseLabel(exhibitionPhase(doc, wallNow.value)),
    // how many of the frames on that wall are this member's
    frames: framesOnWall(doc, personId),
  })),
)
const archivePath = `/archive?photographer=${encodeURIComponent(slug)}`

// A count row, not a badge system: real numbers or the entry does not render.
const counts = computed(() =>
  [
    { label: 'Essays', n: essaysData.value?.totalDocs ?? 0 },
    { label: 'Frames in archive', n: framesTotal.value, to: archivePath },
    { label: 'Albums', n: albumsData.value?.totalDocs ?? 0 },
    { label: 'Exhibitions', n: exhibitionsData.value?.totalDocs ?? 0 },
    { label: 'Workshops facilitated', n: workshopsData.value?.totalDocs ?? 0 },
    { label: 'Walks led', n: walksData.value?.totalDocs ?? 0 },
  ].filter((c) => c.n > 0) as { label: string; n: number; to?: string }[],
)

// og:image is the generated C3 share card (server route).
const shareImage = computed(() => {
  const p = person.value
  if (!p?.slug) return undefined
  return `/share/photographer/${p.slug}.jpg?v=${p.updatedAt ? new Date(p.updatedAt).getTime() : 0}`
})
const portraitAlt = computed(() => {
  const p = person.value?.portrait
  return p && typeof p === 'object' ? (p.alt ?? undefined) : undefined
})

useShareMeta({
  title: person.value?.name ?? 'Photographer',
  description: `${person.value?.name} is a photographer with the Bathong. collective${person.value?.basedIn ? `, based in ${person.value.basedIn}` : ''}.`,
  image: shareImage.value,
  imageAlt:
    portraitAlt.value ??
    `Share card for ${person.value?.name ?? 'a photographer'} of the Bathong. collective.`,
  type: 'website',
})

function essayLeadSrc(essay: Essay): string | null {
  const lead = essay.leadFrame
  return lead && typeof lead === 'object' ? mediaSrc(lead.image as never) : null
}
const licensingLine = computed(() =>
  person.value?.showContact && person.value?.contactEmail
    ? 'Licensing enquiries go directly to the photographer.'
    : 'Licensing enquiries through the collective.',
)

function frameMedia(frame: Frame): Media | null {
  return frame.image && typeof frame.image === 'object' ? frame.image : null
}
function frameAlt(frame: Frame): string {
  return frameMedia(frame)?.alt || frame.caption || ''
}
// The feed's stagger (wide/narrow alternating); a portrait always takes the
// narrow cell, so it is never taller than the screen it is seen on.
function frameSpan(frame: Frame, i: number): 'wide' | 'narrow' {
  const m = frameMedia(frame)
  if (m?.width && m?.height && m.height > m.width) return 'narrow'
  return i % 4 === 0 || i % 4 === 3 ? 'wide' : 'narrow'
}

// Without JS (or with a modifier key) a frame opens its larger rendition in
// its own tab, through ipx like the workshop invite: the raw /api/media path
// does not exist on this origin. 1920 is the widest screen step.
const img = useImage()
function frameFullSrc(frame: Frame): string {
  return img(mediaSrc(frame.image as never)!, { width: 1920, quality: 85 })
}

// ---- the viewer: one frame, whole, on ink, the credit still under it ----
const viewer = ref<HTMLDialogElement | null>(null)
const openIndex = ref<number | null>(null)
const openFrame = computed(() =>
  openIndex.value === null ? null : (frames.value[openIndex.value] ?? null),
)
// The figure is sized from the file's own ratio so the frame is seen whole
// and the capsule sits exactly under it; 3/2 until the file says otherwise.
const openRatio = computed(() => {
  const m = openFrame.value ? frameMedia(openFrame.value) : null
  return m?.width && m?.height ? m.width / m.height : 1.5
})

function openViewer(i: number) {
  openIndex.value = i
  if (!viewer.value?.open) viewer.value?.showModal()
}
function step(direction: 1 | -1) {
  if (openIndex.value === null) return
  const next = openIndex.value + direction
  if (next >= 0 && next < frames.value.length) openIndex.value = next
}
function onViewerKey(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    step(1)
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    step(-1)
  }
}
</script>

<template>
  <div v-if="person">
    <section class="chapter">
      <PhotographerHeader :person="person" :fallback-email="settings?.contactEmail" />
    </section>

    <section v-if="counts.length" class="counts b-caption" aria-label="Body of work">
      <span v-for="(c, i) in counts" :key="c.label">
        <NuxtLink v-if="c.to" :to="c.to">{{ c.label }} {{ c.n }}</NuxtLink>
        <template v-else>{{ c.label }} {{ c.n }}</template>
        <template v-if="i < counts.length - 1"> · </template>
      </span>
    </section>

    <section class="share">
      <ShareRow :title="person.name" />
    </section>

    <section v-if="essays.length" v-reveal class="chapter">
      <ChapterHead title="Essays" />
      <div class="essay-grid">
        <NuxtLink v-for="essay in essays" :key="essay.id" :to="`/stories/${essay.slug}`" class="card">
          <BFrame
            :src="essayLeadSrc(essay)"
            :alt="essay.title"
            sizes="xs:100vw md:33vw lg:33vw xl:480px"
            class="card-frame"
          />
          <h3 class="b-display-2">{{ essay.title }}</h3>
        </NuxtLink>
      </div>
    </section>

    <!-- the newest frames, not a selection: the member's own edit comes later -->
    <section v-if="frames.length" v-reveal class="chapter">
      <ChapterHead title="Newest frames" />
      <div class="run">
        <figure
          v-for="(frame, i) in frames"
          :key="frame.id"
          class="cell"
          :class="[frameSpan(frame, i), { dropped: i % 2 === 1 }]"
        >
          <a
            :href="frameFullSrc(frame)"
            target="_blank"
            rel="noopener"
            class="open"
            :aria-label="frameAlt(frame) ? `Open the frame: ${frameAlt(frame)}` : 'Open the frame'"
            @click.exact.prevent="openViewer(i)"
          >
            <NuxtPicture
              :src="mediaSrc(frame.image as never)!"
              :alt="frameAlt(frame)"
              :width="frameMedia(frame)?.width ?? undefined"
              :height="frameMedia(frame)?.height ?? undefined"
              sizes="xs:100vw md:60vw lg:60vw xl:900px"
              format="avif,webp"
              :loading="i === 0 ? 'eager' : 'lazy'"
              :img-attrs="{ class: 'run-img' }"
            />
          </a>
          <FrameCaption
            standalone
            :credit="frameCredit(frame)"
            :place="frame.location ?? undefined"
            :time="frame.year ? String(frame.year) : undefined"
          />
          <p v-if="frame.caption" class="b-caption note">{{ frame.caption }}</p>
        </figure>
      </div>
      <NuxtLink v-if="framesTotal > frames.length" :to="archivePath" class="b-kicker more">
        All {{ framesTotal }} frames in the archive →
      </NuxtLink>
    </section>

    <!-- the member's galleries: the cover as shot, the words beside it, sides alternating -->
    <section v-if="albums.length" v-reveal class="chapter">
      <ChapterHead title="Albums" />
      <div class="albums">
        <NuxtLink v-for="album in albums" :key="album.id" :to="`/albums/${album.slug}`" class="album">
          <figure v-if="mediaSrc(albumCover(album) as never)" class="album-cover">
            <NuxtPicture
              :src="mediaSrc(albumCover(album) as never)!"
              :alt="albumCover(album)?.alt ?? album.title"
              :width="albumCover(album)?.width ?? undefined"
              :height="albumCover(album)?.height ?? undefined"
              sizes="xs:100vw md:60vw lg:60vw xl:900px"
              format="avif,webp"
              loading="lazy"
              :img-attrs="{ class: 'run-img' }"
            />
            <FrameCaption standalone :credit="albumImageCredit(albumCover(album) ?? {}, albumCredit(album))" />
          </figure>
          <div class="album-words">
            <h3 class="b-display-2">{{ album.title }}</h3>
            <p class="b-caption">
              {{ album.images?.length ?? 0 }} photograph{{ (album.images?.length ?? 0) === 1 ? '' : 's' }}
              <template v-if="album.date"> · {{ formatWalkDate(album.date) }}</template>
            </p>
            <span class="b-kicker door">Open the album →</span>
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- where the frames hang: each row a door to the exhibition -->
    <section v-if="exhibitions.length" v-reveal class="chapter">
      <ChapterHead title="Exhibitions" />
      <ul class="b-ruled">
        <li v-for="exhibition in exhibitions" :key="exhibition.doc.id">
          <span class="num wall-phase">{{ exhibition.phase }}</span>
          <NuxtLink :to="exhibitionPath(exhibition.doc)" class="wall-link">
            {{ exhibition.doc.title }} →
            <small>
              <template v-if="exhibition.frames">{{ exhibition.frames }} frame{{ exhibition.frames === 1 ? '' : 's' }} · </template>{{ exhibition.doc.venue ?? 'Venue TBC' }} · {{ exhibitionDates(exhibition.doc) }}
            </small>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <!-- the taught side, on paper: each row a door to the workshop's own page -->
    <section v-if="workshops.length" v-reveal class="chapter chapter--paper">
      <ChapterHead title="Workshops facilitated" />
      <ul class="b-ruled">
        <li v-for="workshop in workshops" :key="workshop.id">
          <span class="num">{{ workshopNo(workshop) }}</span>
          <NuxtLink :to="workshopPath(workshop)" class="row-link">
            {{ workshop.title }}
            <small>{{ formatWalkDate(workshop.date) }} · {{ workshop.venueName ?? 'Venue TBC' }}</small>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <!-- the copyright plate, on the record -->
    <section class="plate on-jacaranda">
      <p class="b-lede">All work © {{ person.name }}. {{ licensingLine }}</p>
    </section>

    <!-- the viewer: a native dialog, so Escape closes it and focus returns to the frame -->
    <dialog
      ref="viewer"
      class="viewer"
      aria-label="Frame, full view"
      @close="openIndex = null"
      @click.self="viewer?.close()"
      @keydown="onViewerKey"
    >
      <figure v-if="openFrame && openIndex !== null" class="viewer-frame" :style="{ '--ratio': openRatio }">
        <NuxtPicture
          :key="openFrame.id"
          :src="mediaSrc(openFrame.image as never)!"
          :alt="frameAlt(openFrame)"
          :width="frameMedia(openFrame)?.width ?? undefined"
          :height="frameMedia(openFrame)?.height ?? undefined"
          sizes="xs:100vw md:100vw lg:100vw xl:1920px"
          format="avif,webp"
          :img-attrs="{ class: 'viewer-img' }"
        />
        <FrameCaption
          standalone
          :credit="frameCredit(openFrame)"
          :index="frameIndex(openIndex + 1, frames.length)"
          :place="openFrame.location ?? undefined"
          :time="openFrame.year ? String(openFrame.year) : undefined"
        />
        <p v-if="openFrame.caption" class="b-caption note">{{ openFrame.caption }}</p>
      </figure>
      <nav class="viewer-nav b-kicker" aria-label="Frames">
        <!-- aria-disabled, not disabled: a disabled button drops focus and the arrow keys with it -->
        <button type="button" :aria-disabled="openIndex === 0" @click="step(-1)">← Previous</button>
        <button type="button" @click="viewer?.close()">Close</button>
        <button type="button" :aria-disabled="openIndex === frames.length - 1" @click="step(1)">Next →</button>
      </nav>
    </dialog>
  </div>
</template>

<style scoped>
.counts a {
  color: inherit;
}
.counts a:hover {
  color: var(--signal);
}
.counts {
  padding: 0 var(--space-4);
  border-top: 1px solid var(--grey-line);
  border-bottom: 1px solid var(--grey-line);
  margin: 0 var(--space-4);
  padding: var(--space-3) 0;
  color: var(--grey-ghost);
}
.share {
  padding: var(--space-4) var(--space-4) 0;
  color: var(--grey-ghost);
}
.essay-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4) var(--space-3);
}
.card {
  color: inherit;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.card:hover .b-display-2 {
  color: var(--signal);
}
.card-frame {
  border: 1px solid var(--grey-line);
}
/* the run: the album stagger, natural ratios - never crop to fill */
.run {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-5) var(--space-4);
  align-items: start;
}
.cell {
  margin: 0;
  display: flex;
  flex-direction: column;
}
.cell.wide {
  grid-column: span 7;
}
.cell.narrow {
  grid-column: span 5;
}
.cell.dropped {
  margin-top: var(--space-6);
}
.open {
  display: block;
  cursor: zoom-in;
}
.run :deep(picture),
.album-cover :deep(picture) {
  display: block;
}
/* the 2px ink frame is invisible on ink; hairline instead, and no crop */
.run :deep(.run-img),
.album-cover :deep(.run-img) {
  display: block;
  width: 100%;
  height: auto;
  border: 1px solid var(--grey-line);
  border-bottom: 0;
}
.open:hover :deep(.run-img),
.open:focus-visible :deep(.run-img) {
  border-color: var(--paper);
}
.note {
  margin-top: var(--space-2);
  color: var(--grey-ghost);
}
.more {
  display: inline-block;
  margin-top: var(--space-5);
  color: var(--signal);
}
.albums {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}
.album {
  display: flex;
  align-items: flex-end;
  gap: var(--space-4);
  color: inherit;
}
.album:nth-child(even) {
  flex-direction: row-reverse;
}
.album-cover {
  flex: 7;
  min-width: 0;
  margin: 0;
}
.album-words {
  flex: 5;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.album:hover .b-display-2 {
  color: var(--signal);
}
.door {
  margin-top: var(--space-2);
  color: var(--signal);
}
.wall-link {
  color: inherit;
  display: block;
}
.wall-link:hover {
  color: var(--signal);
}
/* the phase is a word, wider than a number: keep the titles on one edge */
.b-ruled .wall-phase {
  min-width: 7.4em;
  text-transform: uppercase;
}
.row-link {
  color: inherit;
  display: block;
}
.row-link:hover {
  color: var(--jacaranda-deep);
}
.plate {
  padding: var(--space-5) var(--space-4);
}
.plate .b-lede {
  color: var(--paper);
}
/* the viewer fills the screen with ink; the frame is seen whole or not at all */
.viewer {
  width: 100vw;
  height: 100dvh;
  max-width: none;
  max-height: none;
  border: 0;
  padding: var(--space-4);
  background: var(--ink);
  color: var(--paper);
  overflow: auto;
}
.viewer[open] {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
}
.viewer-frame {
  margin: 0;
  width: min(100%, calc(72vh * var(--ratio)));
  flex: none;
}
.viewer-frame :deep(picture) {
  display: block;
}
.viewer-frame :deep(.viewer-img) {
  display: block;
  width: 100%;
  height: auto;
  border: 1px solid var(--grey-line);
  border-bottom: 0;
}
.viewer-nav {
  display: flex;
  gap: var(--space-4);
  flex: none;
}
.viewer-nav button {
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  background: none;
  border: 0;
  color: var(--signal);
  cursor: pointer;
  min-height: 44px;
}
.viewer-nav button:hover {
  color: var(--paper);
}
.viewer-nav button[aria-disabled='true'] {
  color: var(--grey-line);
  cursor: default;
}
/* the page behind does not scroll while a frame is open */
:global(html:has(dialog.viewer[open])) {
  overflow: hidden;
}
@media (max-width: 840px) {
  .essay-grid {
    grid-template-columns: 1fr;
  }
  .cell.wide,
  .cell.narrow {
    grid-column: span 12;
  }
  .cell.dropped {
    margin-top: 0;
  }
  .albums {
    gap: var(--space-5);
  }
  .album,
  .album:nth-child(even) {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-3);
  }
}
</style>

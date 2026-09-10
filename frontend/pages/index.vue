<script setup lang="ts">
/**
 * Home, in the darkroom: one lead frame, then the programme as the one
 * jacaranda chapter (the soonest event leads, walk or workshop, with the
 * other as a single ruled line), the open call as the page's one signal
 * plate when a call is open, the feed staggered on ink, the latest albums
 * as the record, membership as a paper chapter. Structure is carried by
 * scale and plate changes, not furniture; the only numbering is the real №.
 * The rule of the page: no content, no section. Nothing is invented.
 */
import type {
  Frame,
  Essay,
  Walk,
  Workshop,
  Album,
  Photocall,
  SiteSetting,
  Membership,
} from '~/types/payload-types'

useShareMeta({
  description:
    'Bathong is a street and documentary photography collective. It starts in Pretoria and walks outward: photowalks, group edits, honest feedback, stories about people as they are.',
})

interface List<T> { docs: T[] }
type WalkDoc = Walk & { spotsTaken?: number }
type WorkshopDoc = Workshop & { spotsTaken?: number }

// One clock for every programme query: current until it wraps.
const now = new Date().toISOString()

const [
  { data: frames },
  { data: essays },
  { data: topPicks },
  { data: nextWalk },
  { data: nextWorkshop },
  { data: albumsData },
  { data: photocall },
  { data: settings },
  { data: membership },
] =
  await Promise.all([
    useCmsData<List<Frame>>('frames-latest', '/api/frames?limit=7&sort=-createdAt&depth=1'),
    useCmsData<List<Essay>>('essays-feed', '/api/essays?sort=-publishedDate&limit=12&depth=2'),
    useCmsData<List<Frame>>(
      'frames-top-picks',
      '/api/frames?where[topPick][equals]=true&limit=24&sort=-createdAt&depth=1',
    ),
    useCmsData<List<WalkDoc>>('walks-next', nextWalksQuery(now, 1)),
    useCmsData<List<WorkshopDoc>>('workshops-next', nextWorkshopsQuery(now, 1, 0)),
    // two covers: the record is a door, not the archive, and the 1MB
    // first-view budget pays for every byte here
    useCmsData<List<Album>>('albums-home', latestAlbumsQuery(2)),
    // shared key with /photocalls: the query builder keeps the strings identical
    useCmsData<List<Photocall>>('photocall-open', openPhotocallQuery()),
    useCmsData<SiteSetting>('site-settings', '/api/globals/site-settings'),
    useCmsData<Membership>('membership', '/api/globals/membership'),
  ])

// The lead rotates among editors' top picks, one per visit. The random seed
// lives in useState so the server's choice survives hydration unchanged.
const leadSeed = useState('lead-pick-seed', () => Math.random())
const leadFrame = computed(() => {
  const picks = topPicks.value?.docs ?? []
  if (picks.length) return picks[Math.floor(leadSeed.value * picks.length)] ?? picks[0]
  return frames.value?.docs?.[0] ?? null
})
// The feed draws one frame per essay in turn, so a fresh upload of a dozen
// frames for one story can't crowd the others out. Each essay's run starts
// at a seeded offset so the mix shifts per visit; a frame that appears in
// several essays is shown once. Single frames outside any essay fill in.
const essayFrames = (essay: Essay): Frame[] => {
  const out: Frame[] = []
  for (const block of essay.sequence ?? []) {
    if (block.blockType === 'frame') out.push(block.frame as Frame)
    else if (block.blockType === 'pair') out.push(block.left as Frame, block.right as Frame)
  }
  return out.filter((f) => f && typeof f === 'object')
}
const feedFrames = computed(() => {
  const seen = new Set<string | number>()
  if (leadFrame.value) seen.add(leadFrame.value.id)
  const runs = (essays.value?.docs ?? [])
    .map(essayFrames)
    .filter((run) => run.length)
    .map((run) => {
      const start = Math.floor(leadSeed.value * run.length)
      return [...run.slice(start), ...run.slice(0, start)]
    })
  const picked: Frame[] = []
  for (let i = 0; picked.length < 6 && runs.some((run) => i < run.length); i++) {
    for (const run of runs) {
      const frame = run[i]
      if (!frame || seen.has(frame.id)) continue
      seen.add(frame.id)
      picked.push(frame)
      if (picked.length === 6) break
    }
  }
  for (const frame of frames.value?.docs ?? []) {
    if (picked.length === 6) break
    if (seen.has(frame.id)) continue
    seen.add(frame.id)
    picked.push(frame)
  }
  return picked
})

// ---- the programme: soonest event leads, the other gets one line ----
type Candidate =
  | { kind: 'walk'; doc: WalkDoc }
  | { kind: 'workshop'; doc: WorkshopDoc }

const dateMs = (d?: string | null) => (d ? Date.parse(d) : Number.POSITIVE_INFINITY)

const candidates = computed<Candidate[]>(() => {
  const list: Candidate[] = []
  const walk = nextWalk.value?.docs?.[0]
  if (walk) list.push({ kind: 'walk', doc: walk })
  const workshop = nextWorkshop.value?.docs?.[0]
  if (workshop) list.push({ kind: 'workshop', doc: workshop })
  return list.sort((a, b) => dateMs(a.doc.date) - dateMs(b.doc.date))
})
const primary = computed(() => candidates.value[0] ?? null)
const secondary = computed(() => candidates.value[1] ?? null)

// A workshop rides the structural plate the way its own pages do: the venue
// in the meeting-point slot, the description in the route card.
const primaryPlate = computed(() => {
  const p = primary.value
  if (!p) return null
  if (p.kind === 'walk') return p.doc
  const w = p.doc
  return {
    ...w,
    meetingPoint: [w.venueName, w.venueAddress].filter(Boolean).join(', ') || null,
    route: w.description,
  }
})
const primaryPath = computed(() => {
  const p = primary.value
  if (!p) return '/walks'
  return p.kind === 'workshop' ? workshopPath(p.doc) : walkPath(p.doc)
})
const secondaryPath = computed(() => {
  const s = secondary.value
  if (!s) return '/walks'
  return s.kind === 'workshop' ? workshopPath(s.doc) : walkPath(s.doc)
})
const secondaryNo = computed(() => {
  const s = secondary.value
  if (!s) return ''
  return s.kind === 'walk' ? walkNo(s.doc) : workshopNo(s.doc)
})
const secondaryMeta = computed(() => {
  const s = secondary.value
  if (!s) return ''
  const place = s.kind === 'walk' ? s.doc.meetingPoint : s.doc.venueName
  return [formatWalkDate(s.doc.date), place].filter(Boolean).join(' · ')
})

const call = computed(() => photocall.value?.docs?.[0] ?? null)
const albums = computed(() => albumsData.value?.docs?.slice(0, 2) ?? [])
const tickerItems = computed(() =>
  (settings.value?.ticker ?? []).map((t) => t.text).filter((t): t is string => Boolean(t)),
)
</script>

<template>
  <div>
    <!-- one lead frame, full bleed, credited -->
    <section class="lead">
      <BFrame
        :src="leadFrame ? mediaSrc(leadFrame.image as never) : null"
        :alt="leadFrame && typeof leadFrame.image === 'object' ? leadFrame.image?.alt ?? '' : ''"
        ratio="wide"
        :credit="leadFrame ? frameCredit(leadFrame) : 'Bathong. Collective'"
        :place="leadFrame?.location ?? undefined"
        eager
        sizes="xs:100vw md:100vw lg:100vw xl:1440px"
        class="lead-frame"
      />
    </section>

    <!-- the programme: the one jacaranda chapter, soonest event first -->
    <EventBlock v-if="primary && primaryPlate" :walk="primaryPlate" :kind="primary.kind">
      <BButton :to="primaryPath" variant="ghost">Reserve a place →</BButton>
    </EventBlock>

    <section v-if="secondary" class="programme-also">
      <p class="b-kicker">Also on the programme</p>
      <ul class="b-ruled">
        <li>
          <span class="num">{{ secondaryNo }}</span>
          <NuxtLink :to="secondaryPath" class="row-link">
            {{ secondary.doc.title }} →
            <small>{{ secondaryMeta }}</small>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <!-- the open call: the one signal plate a page may carry -->
    <section v-if="call" class="chapter--signal call-signal">
      <p class="b-kicker">Photocall · open</p>
      <div class="call-line">
        <h2 class="b-display-2">{{ call.title }}</h2>
        <p v-if="call.closesAt" class="b-caption">Closes {{ formatWalkDate(call.closesAt) }}</p>
        <BButton to="/photocalls" variant="ghost">Submit →</BButton>
      </div>
    </section>

    <!-- the feed on ink, staggered -->
    <section v-if="feedFrames.length" v-reveal class="chapter">
      <ChapterHead title="The feed" />
      <p class="b-caption feed-note">
        Frames from across the collective's essays · <NuxtLink to="/stories">Read the stories</NuxtLink>
      </p>
      <FeedGrid :frames="feedFrames" />
    </section>

    <!-- the record: the latest snapshot galleries, credited -->
    <section v-if="albums.length" v-reveal class="chapter">
      <ChapterHead title="Albums" />
      <div class="albums-grid">
        <NuxtLink v-for="album in albums" :key="album.id" :to="`/albums/${album.slug}`" class="card">
          <BFrame
            :src="mediaSrc(albumCover(album) as never)"
            :alt="albumCover(album)?.alt ?? album.title"
            :credit="albumCredit(album)"
            sizes="xs:100vw md:40vw lg:40vw xl:560px"
            class="card-frame"
          />
          <h3 class="b-display-2">{{ album.title }}</h3>
          <p class="b-caption">
            {{ album.images?.length ?? 0 }} photograph{{ (album.images?.length ?? 0) === 1 ? '' : 's' }}
            <template v-if="album.date"> · {{ formatWalkDate(album.date) }}</template>
          </p>
        </NuxtLink>
      </div>
      <p class="b-kicker albums-link"><NuxtLink to="/albums">All albums →</NuxtLink></p>
    </section>

    <!-- membership: a paper chapter in the darkroom -->
    <section v-reveal class="chapter chapter--paper">
      <ChapterHead title="Become a member" />
      <p class="b-lede">
        {{ formatPrice(membership?.joiningFee) }} to join, then {{ formatPrice(membership?.priceMonthly) }} a month
        or {{ formatPrice(membership?.priceAnnual) }} a year. Walks, the edit, real feedback, the wall.
        You keep your copyright. Always.
      </p>
      <div class="member-cta">
        <BButton to="/about#membership" variant="ghost">How membership works →</BButton>
      </div>
    </section>

    <BTicker :items="tickerItems" />
  </div>
</template>

<style scoped>
.lead-frame {
  border: 0;
}
.programme-also {
  padding: var(--space-4) var(--space-4) var(--space-5);
}
.programme-also .row-link {
  color: inherit;
  display: block;
}
.programme-also .row-link:hover {
  color: var(--signal);
}
.call-signal {
  padding: var(--space-4);
}
.call-line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-2) var(--space-4);
}
/* the on-ink ghost rule would paint a paper border, invisible on signal */
.call-signal :deep(.b-btn--ghost) {
  color: var(--ink);
  border-color: var(--ink);
}
.call-signal :deep(.b-btn--ghost:hover) {
  background: var(--ink);
  color: var(--signal);
}
.feed-note {
  margin: calc(-1 * var(--space-4)) 0 var(--space-5);
}
.albums-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: var(--space-5) var(--space-4);
  align-items: start;
}
.albums-grid .card:nth-child(even) {
  margin-top: var(--space-5);
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
.albums-link {
  margin-top: var(--space-4);
}
.albums-link a {
  color: var(--signal);
}
.member-cta {
  margin-top: var(--space-4);
}
@media (max-width: 840px) {
  .albums-grid {
    grid-template-columns: 1fr;
  }
  .albums-grid .card:nth-child(even) {
    margin-top: 0;
  }
}
</style>

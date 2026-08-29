<script setup lang="ts">
/**
 * One walk. Upcoming, it is the event: the jacaranda plate, the route, the
 * RSVP. Walked, it is the record: the facts on ink, the route as it was, and
 * everything the walk produced - essays, frames, albums - each a door onward.
 * Nothing invented: a walk with no work yet says so in one line.
 */
import type { Walk, Essay, Frame, Album, Media } from '~/types/payload-types'

const route = useRoute()
const slug = route.params.slug as string

interface List<T> { docs: T[] }
type WalkDoc = Walk & { spotsTaken?: number }

const { data } = await useCmsData<List<WalkDoc>>(
  `walk-${slug}`,
  // depth 3 reaches essay -> leadFrame -> image through the essays join
  `/api/walks?where[slug][equals]=${encodeURIComponent(slug)}&limit=1&depth=3&joins[essays][limit]=24&joins[essays][sort]=-publishedDate&joins[frames][limit]=12&joins[frames][sort]=-createdAt&joins[albums][limit]=12&joins[albums][sort]=-date`,
)
const walk = computed(() => data.value?.docs?.[0] ?? null)

if (!walk.value) {
  throw createError({ statusCode: 404, statusMessage: 'Walk not found', fatal: true })
}

const past = computed(() => isPastWalk(walk.value!))
const routeGeo = computed(() => parseRouteGeo(walk.value?.routeGeo))
const leader = computed(() =>
  walk.value?.leader && typeof walk.value.leader === 'object' ? walk.value.leader : null,
)
const isDoc = <T,>(v: T | number | string | null | undefined): v is T =>
  Boolean(v) && typeof v === 'object'
const essays = computed(() => (walk.value?.essays?.docs ?? []).filter(isDoc<Essay>))
const frames = computed(() => (walk.value?.frames?.docs ?? []).filter(isDoc<Frame>))
const albums = computed(() => (walk.value?.albums?.docs ?? []).filter(isDoc<Album>))
const hasWork = computed(() => essays.value.length + frames.value.length + albums.value.length > 0)

const rsvpOpen = computed(
  () => !past.value && !walk.value?.bookingUrl && walk.value?.bookingStatus !== 'closed',
)

function leadSrc(essay: Essay): string | null {
  const lead = essay.leadFrame
  return lead && typeof lead === 'object' ? mediaSrc(lead.image as never) : null
}
function albumCover(album: Album): Media | null {
  const first = album.images?.[0]
  return first && typeof first === 'object' ? first : null
}
function albumCredit(album: Album): string {
  const p = album.photographer
  return album.creditOverride ?? (p && typeof p === 'object' ? p.name : null) ?? 'Bathong. Collective'
}

const description = computed(() => {
  const w = walk.value!
  const when = formatWalkDate(w.date)
  const where = w.meetingPoint ? `, from ${w.meetingPoint}` : ''
  return past.value
    ? `${w.title}. A Bathong. photowalk, ${when}${where}. What the walk produced: essays, frames and albums, credited.`
    : `${w.title}. A Bathong. photowalk, ${when}${where}. No experience needed, no gear requirement, everyone welcome.`
})

useShareMeta({
  title: walk.value.title,
  description: description.value,
  image: `/share/walk/${encodeURIComponent(slug)}.jpg?v=${walk.value.updatedAt ? new Date(walk.value.updatedAt).getTime() : 0}`,
  imageAlt: `Card for Bathong. walk ${walkNo(walk.value)}, ${formatWalkDate(walk.value.date)}.`,
})
</script>

<template>
  <div v-if="walk">
    <!-- the record: walked -->
    <template v-if="past">
      <section class="chapter head">
        <p class="b-kicker">Walk · {{ walkNo(walk) }} · walked</p>
        <h1 class="b-display-1">{{ walk.title }}</h1>
        <dl class="facts b-caption">
          <div><dt>Date</dt><dd>{{ formatWalkDate(walk.date) }}</dd></div>
          <div><dt>Start</dt><dd>{{ formatWalkTime(walk.date) }}</dd></div>
          <div v-if="walk.endTime"><dt>Wrapped</dt><dd>{{ formatWalkTime(walk.endTime) }}</dd></div>
          <div v-if="walk.meetingPoint"><dt>Met at</dt><dd>{{ walk.meetingPoint }}</dd></div>
          <div v-if="leader">
            <dt>Led by</dt>
            <dd>
              <NuxtLink v-if="leader.slug" :to="`/photographers/${leader.slug}`">{{ leader.name }}</NuxtLink>
              <template v-else>{{ leader.name }}</template>
            </dd>
          </div>
        </dl>
        <ShareRow :title="walk.title" />
      </section>

      <section v-if="routeGeo" v-reveal class="chapter">
        <ChapterHead title="The route" />
        <RouteMap :route="routeGeo" :meeting-point="walk.meetingPoint" />
      </section>

      <section v-if="essays.length" v-reveal class="chapter">
        <ChapterHead title="Essays" />
        <div class="essay-grid">
          <NuxtLink v-for="essay in essays" :key="essay.id" :to="`/stories/${essay.slug}`" class="card">
            <BFrame :src="leadSrc(essay)" :alt="essay.title" sizes="xs:100vw md:33vw lg:33vw xl:480px" class="card-frame" />
            <h3 class="b-display-2">{{ essay.title }}</h3>
          </NuxtLink>
        </div>
      </section>

      <section v-if="frames.length" v-reveal class="chapter">
        <ChapterHead title="Frames" />
        <!-- the contact sheet run: natural ratios, never cropped, every cell credited -->
        <div class="sheet">
          <figure v-for="(frame, i) in frames" :key="frame.id" class="sheet-cell">
            <NuxtPicture
              v-if="mediaSrc(frame.image as never)"
              :src="mediaSrc(frame.image as never)!"
              :alt="typeof frame.image === 'object' && frame.image?.alt ? frame.image.alt : ''"
              sizes="xs:33vw md:12vw lg:12vw xl:200px"
              format="avif,webp"
              loading="lazy"
              :img-attrs="{ class: 'sheet-img' }"
            />
            <figcaption class="b-caption">
              {{ String(i + 1).padStart(2, '0') }} · <span class="b-credit">{{ frameCredit(frame) }}</span>
            </figcaption>
          </figure>
        </div>
        <NuxtLink :to="`/archive?walk=${encodeURIComponent(walk.slug ?? '')}`" class="b-kicker more">
          All frames from this walk →
        </NuxtLink>
      </section>

      <section v-if="albums.length" v-reveal class="chapter">
        <ChapterHead title="Albums" />
        <div class="album-grid">
          <NuxtLink v-for="album in albums" :key="album.id" :to="`/albums/${album.slug}`" class="card">
            <BFrame
              :src="mediaSrc(albumCover(album) as never)"
              :alt="albumCover(album)?.alt ?? album.title"
              :credit="albumCredit(album)"
              sizes="xs:100vw md:50vw lg:50vw xl:720px"
              class="card-frame"
            />
            <h3 class="b-display-2">{{ album.title }}</h3>
            <p class="b-caption">{{ album.images?.length ?? 0 }} photographs<template v-if="album.date"> · {{ formatWalkDate(album.date) }}</template></p>
          </NuxtLink>
        </div>
      </section>

      <section v-if="!hasWork" class="chapter">
        <p class="b-lede">Nothing published from this walk yet.</p>
      </section>
    </template>

    <!-- the event: still to come, or walking now -->
    <template v-else>
      <EventBlock :walk="walk">
        <BButton v-if="rsvpOpen" href="#rsvp" variant="ghost">Reserve a place →</BButton>
        <BButton v-else-if="walk.bookingUrl" :href="walk.bookingUrl" variant="ghost">Reserve a place →</BButton>
        <p v-else class="b-caption">Bookings closed</p>
      </EventBlock>

      <section class="chapter share">
        <ShareRow :title="walk.title" />
      </section>

      <section v-if="routeGeo" v-reveal class="chapter">
        <ChapterHead title="The route" />
        <RouteMap :route="routeGeo" :meeting-point="walk.meetingPoint" />
      </section>

      <section v-if="rsvpOpen" id="rsvp" v-reveal class="chapter">
        <ChapterHead title="Reserve a place" />
        <RsvpForm :walk-id="walk.id" />
      </section>
    </template>

    <p class="b-kicker back"><NuxtLink to="/walks">All walks →</NuxtLink></p>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.head .b-kicker {
  color: var(--grey-ghost);
}
.facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, max-content));
  gap: var(--space-3) var(--space-5);
  margin: var(--space-3) 0;
  padding: var(--space-3) 0;
  border-top: 1px solid var(--grey-line);
  border-bottom: 1px solid var(--grey-line);
  color: var(--grey-ghost);
}
.facts dt {
  color: var(--grey-ghost);
}
.facts dd {
  margin: 4px 0 0;
  color: var(--paper);
}
.facts a {
  color: var(--signal);
}
.share {
  padding-top: var(--space-4);
  padding-bottom: var(--space-4);
}
.essay-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4) var(--space-3);
}
.album-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
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
.sheet {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3) var(--space-2);
}
.sheet-cell {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sheet-cell :deep(picture) {
  display: block;
}
.sheet-cell :deep(.sheet-img) {
  height: 120px;
  width: auto;
  display: block;
  border: 1px solid var(--grey-line);
}
.more {
  display: inline-block;
  margin-top: var(--space-4);
  color: var(--signal);
}
.back {
  padding: 0 var(--space-4) var(--space-5);
}
.back a {
  color: var(--grey-ghost);
}
.back a:hover {
  color: var(--signal);
}
@media (max-width: 840px) {
  .essay-grid,
  .album-grid {
    grid-template-columns: 1fr;
  }
  .sheet-cell :deep(.sheet-img) {
    height: 90px;
  }
}
</style>

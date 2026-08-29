<script setup lang="ts">
/**
 * Walks: the next walk is the page (jacaranda chapter, date enormous), the
 * four lines that answer the fear on a paper chapter, the RSVP back on ink.
 * № numbering stays: walks are genuinely a numbered sequence. Every row is
 * a door to the walk's own page, where a walked walk becomes the record.
 */
import type { Walk } from '~/types/payload-types'

interface List<T> { docs: T[] }
type WalkDoc = Walk & { spotsTaken?: number }

// A walk is current until it wraps (endTime), not until it starts - while
// the collective is on the street the walk stays the page.
const now = new Date().toISOString()
const [{ data: upcoming }, { data: past }] = await Promise.all([
  useCmsData<List<WalkDoc>>('walks-upcoming', nextWalksQuery(now, 10)),
  useCmsData<List<WalkDoc>>('walks-past', pastWalksQuery(now, 10)),
])

const nextWalk = computed(() => upcoming.value?.docs?.[0] ?? null)
const nextRoute = computed(() => (nextWalk.value ? parseRouteGeo(nextWalk.value.routeGeo) : null))
const futureWalks = computed(() => upcoming.value?.docs?.slice(1) ?? [])
const pastWalks = computed(() => past.value?.docs ?? [])
const rsvpOpen = computed(
  () => nextWalk.value && !nextWalk.value.bookingUrl && nextWalk.value.bookingStatus !== 'closed',
)

// What a walked walk produced, from the join ids at depth 0 (free). The
// index only ever reads the first page of each join, so "+" marks more.
function produced(walk: Walk): string | null {
  const parts: string[] = []
  const count = (join?: { docs?: unknown[] | null; hasNextPage?: boolean | null } | null, word = '') => {
    const n = join?.docs?.length ?? 0
    if (!n) return
    parts.push(`${n}${join?.hasNextPage ? '+' : ''} ${word}${n === 1 ? '' : 's'}`)
  }
  count(walk.essays, 'essay')
  count(walk.albums, 'album')
  return parts.length ? parts.join(' · ') : null
}

// og:image is the generated C4 walk card while a walk is upcoming.
useShareMeta({
  title: 'Walks & sessions',
  description:
    'Photowalks from Pretoria outward: meet at first light, shoot together, edit together at the end. No experience needed, no gear requirement, everyone welcome.',
  image: nextWalk.value
    ? `/share/walks.jpg?v=${nextWalk.value.updatedAt ? new Date(nextWalk.value.updatedAt).getTime() : 0}`
    : undefined,
  imageAlt: nextWalk.value
    ? `Announcement card for the next Bathong. photowalk, ${formatWalkDate(nextWalk.value.date)}.`
    : undefined,
})
</script>

<template>
  <div>
    <template v-if="nextWalk">
      <EventBlock :walk="nextWalk">
        <BButton v-if="rsvpOpen" href="#rsvp" variant="ghost">Reserve a place →</BButton>
        <BButton v-else-if="nextWalk.bookingUrl" :href="nextWalk.bookingUrl" variant="ghost">
          Reserve a place →
        </BButton>
        <p v-else class="b-caption">Bookings closed</p>
      </EventBlock>

      <!-- the route on the ink ground; the jacaranda line is the subject -->
      <section v-if="nextRoute" v-reveal class="chapter">
        <ChapterHead title="The route" />
        <RouteMap :route="nextRoute" :meeting-point="nextWalk.meetingPoint" />
      </section>

      <!-- answer the fear, on paper -->
      <section v-reveal class="chapter chapter--paper">
        <ChapterHead title="What a walk is" />
        <div class="what">
          <p class="b-lede">Meet at first light. Shoot together. Edit together at the end.</p>
          <p class="b-lede">No experience needed. No gear requirement. A phone camera counts.</p>
          <p class="b-lede">Bring one lens if you have one, water, and shoes for four hours.</p>
          <p class="b-lede">Everyone welcome. That is the point.</p>
        </div>
      </section>

      <section v-if="rsvpOpen" id="rsvp" v-reveal class="chapter">
        <ChapterHead title="Reserve a place" />
        <RsvpForm :walk-id="nextWalk.id" />
      </section>
    </template>
    <section v-else class="chapter">
      <ChapterHead title="Walks & sessions" />
      <p class="b-lede">No walk is scheduled right now. The next date lands here first. TBC.</p>
    </section>

    <section v-reveal class="chapter">
      <ChapterHead title="After that" />
      <ul v-if="futureWalks.length" class="b-ruled">
        <li v-for="walk in futureWalks" :key="walk.id">
          <span class="num">{{ walkNo(walk) }}</span>
          <NuxtLink :to="walkPath(walk)" class="row-link">
            {{ walk.title }}
            <small>{{ formatWalkDate(walk.date) }} · {{ walk.meetingPoint ?? 'Meeting point TBC' }}</small>
          </NuxtLink>
        </li>
      </ul>
      <ul v-else class="b-ruled">
        <li><span class="num">W/02</span><div>Rooftop session <small>TBC</small></div></li>
        <li><span class="num">W/03</span><div>Night walk, Sunnyside <small>TBC</small></div></li>
      </ul>
    </section>

    <section v-if="pastWalks.length" v-reveal class="chapter">
      <ChapterHead title="From the last walks" />
      <ul class="b-ruled">
        <li v-for="walk in pastWalks" :key="walk.id">
          <span class="num">{{ walkNo(walk) }}</span>
          <NuxtLink :to="walkPath(walk)" class="row-link">
            {{ walk.title }}
            <small>
              {{ formatWalkDate(walk.date) }}<template v-if="produced(walk)"> · {{ produced(walk) }}</template>
            </small>
          </NuxtLink>
        </li>
      </ul>
      <p class="b-kicker albums-link"><NuxtLink to="/albums">Albums from the walks →</NuxtLink></p>
    </section>
  </div>
</template>

<style scoped>
.what {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 62ch;
}
.row-link {
  color: inherit;
  display: block;
}
.row-link:hover {
  color: var(--signal);
}
.albums-link {
  margin-top: var(--space-4);
}
.albums-link a {
  color: var(--signal);
}
</style>

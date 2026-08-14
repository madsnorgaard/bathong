<script setup lang="ts">
/**
 * Walks: the next walk is the page (jacaranda chapter, date enormous), the
 * four lines that answer the fear on a paper chapter, the RSVP back on ink.
 * W/xx numbering stays: walks are genuinely a numbered sequence.
 */
import type { Walk } from '~/types/payload-types'

useShareMeta({
  title: 'Walks & sessions',
  description:
    'Photowalks in Pretoria: meet at first light, shoot together, edit together at the end. No experience needed, no gear requirement, everyone welcome.',
})

interface List<T> { docs: T[] }
type WalkDoc = Walk & { spotsTaken?: number }

const now = new Date().toISOString()
const [{ data: upcoming }, { data: past }] = await Promise.all([
  useCmsData<List<WalkDoc>>(
    'walks-upcoming',
    `/api/walks?where[date][greater_than_equal]=${now}&sort=date&limit=10&depth=0`,
  ),
  useCmsData<List<WalkDoc>>(
    'walks-past',
    `/api/walks?where[date][less_than]=${now}&sort=-date&limit=10&depth=0`,
  ),
])

const nextWalk = computed(() => upcoming.value?.docs?.[0] ?? null)
const nextRoute = computed(() => (nextWalk.value ? parseRouteGeo(nextWalk.value.routeGeo) : null))
const futureWalks = computed(() => upcoming.value?.docs?.slice(1) ?? [])
const pastWalks = computed(() => past.value?.docs ?? [])
const rsvpOpen = computed(
  () => nextWalk.value && !nextWalk.value.bookingUrl && nextWalk.value.bookingStatus !== 'closed',
)
</script>

<template>
  <div>
    <template v-if="nextWalk">
      <EventBlock :walk="nextWalk" :walk-index="1">
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
        <li v-for="(walk, i) in futureWalks" :key="walk.id">
          <span class="num">W/{{ String(i + 2).padStart(2, '0') }}</span>
          <div>
            {{ walk.title }}
            <small>{{ formatWalkDate(walk.date) }} · {{ walk.meetingPoint ?? 'Meeting point TBC' }}</small>
          </div>
        </li>
      </ul>
      <ul v-else class="b-ruled">
        <li><span class="num">W/02</span><div>Rooftop session <small>TBC</small></div></li>
        <li><span class="num">W/03</span><div>Night walk, Sunnyside <small>TBC</small></div></li>
      </ul>
    </section>

    <section v-if="pastWalks.length" v-reveal class="chapter">
      <ChapterHead title="From the last walk" />
      <ul class="b-ruled">
        <li v-for="walk in pastWalks" :key="walk.id">
          <span class="num">№</span>
          <div>{{ walk.title }} <small>{{ formatWalkDate(walk.date) }}</small></div>
        </li>
      </ul>
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
</style>

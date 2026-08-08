<script setup lang="ts">
/**
 * Walks (W5): the next walk IS the page. Jacaranda lead with everything a
 * person needs to decide in eight seconds, four lines that answer the fear,
 * future walks as a ruled list with honest TBC, and the RSVP form inline.
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
const futureWalks = computed(() => upcoming.value?.docs?.slice(1) ?? [])
const pastWalks = computed(() => past.value?.docs ?? [])
const rsvpOpen = computed(
  () => nextWalk.value && !nextWalk.value.bookingUrl && nextWalk.value.bookingStatus !== 'closed',
)
</script>

<template>
  <div class="page">
    <template v-if="nextWalk">
      <!-- 1: the next walk is the page -->
      <EventBlock :walk="nextWalk" :walk-index="1" variant="lead">
        <BButton v-if="rsvpOpen" href="#rsvp" variant="ghost">Reserve a place →</BButton>
        <BButton v-else-if="nextWalk.bookingUrl" :href="nextWalk.bookingUrl" variant="ghost">
          Reserve a place →
        </BButton>
        <p v-else class="b-caption">Bookings closed</p>
      </EventBlock>

      <!-- 2: answer the fear, not the feature -->
      <section v-reveal class="what">
        <p>Meet at first light. Shoot together. Edit together at the end.</p>
        <p>No experience needed. No gear requirement. A phone camera counts.</p>
        <p>Bring one lens if you have one, water, and shoes you can walk four hours in.</p>
        <p>Everyone welcome. That is the point.</p>
      </section>

      <section v-if="rsvpOpen" id="rsvp" v-reveal class="rsvp-section">
        <SectionHead :index="1" title="Reserve a place" />
        <RsvpForm :walk-id="nextWalk.id" />
      </section>
    </template>
    <section v-else class="what">
      <SectionHead :index="1" title="Walks & sessions" />
      <p class="b-lede">No walk is scheduled right now. The next date lands here first. TBC.</p>
    </section>

    <!-- 3: future walks, honest TBC -->
    <section v-reveal class="future">
      <SectionHead :index="2" title="After that" />
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

    <!-- 4: frames from the last walk close the page -->
    <section v-if="pastWalks.length" v-reveal class="future">
      <SectionHead :index="3" title="From the last walk" />
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
.page {
  display: flex;
  flex-direction: column;
}
.what {
  padding: var(--space-6) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-width: 62ch;
}
.rsvp-section,
.future {
  padding: 0 var(--space-4) var(--space-6);
}
</style>

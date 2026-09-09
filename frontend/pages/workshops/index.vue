<script setup lang="ts">
/**
 * Workshops: the taught side of the programme. The next workshop is the
 * page (jacaranda plate, date enormous), the practical lines on paper, the
 * RSVP back on ink. Workshops carry their own № series, apart from the
 * walks. Every row is a door to the workshop's own page.
 */
import type { Workshop } from '~/types/payload-types'

interface List<T> { docs: T[] }
type WorkshopDoc = Workshop & { spotsTaken?: number }

// A workshop is current until it wraps (endTime), not until it starts.
const now = new Date().toISOString()
const [{ data: upcoming }, { data: past }] = await Promise.all([
  useCmsData<List<WorkshopDoc>>('workshops-upcoming', nextWorkshopsQuery(now, 10)),
  useCmsData<List<WorkshopDoc>>('workshops-past', pastWorkshopsQuery(now, 10)),
])

const nextWorkshop = computed(() => upcoming.value?.docs?.[0] ?? null)
const futureWorkshops = computed(() => upcoming.value?.docs?.slice(1) ?? [])
const pastWorkshops = computed(() => past.value?.docs ?? [])
const rsvpOpen = computed(
  () =>
    nextWorkshop.value &&
    !nextWorkshop.value.bookingUrl &&
    nextWorkshop.value.bookingStatus !== 'closed',
)

// EventBlock takes a structural walk-like shape; the venue rides in the
// meeting-point slot and the description in the route card.
const plate = computed(() => {
  const w = nextWorkshop.value
  if (!w) return null
  return {
    ...w,
    meetingPoint: [w.venueName, w.venueAddress].filter(Boolean).join(', ') || null,
    route: w.description,
  }
})

const invite = computed(() =>
  nextWorkshop.value?.heroImage && typeof nextWorkshop.value.heroImage === 'object'
    ? nextWorkshop.value.heroImage
    : null,
)

const practicalLines = computed(
  () =>
    (nextWorkshop.value?.practicalInfo ?? [])
      .map((entry) => entry.line)
      .filter((line): line is string => Boolean(line)),
)

// What a held workshop produced, from the album join ids at depth 0 (free).
function produced(workshop: Workshop): string | null {
  const join = workshop.albums
  const n = join?.docs?.length ?? 0
  if (!n) return null
  return `${n}${join?.hasNextPage ? '+' : ''} album${n === 1 ? '' : 's'}`
}

// og:image is the generated workshop card while one is upcoming.
useShareMeta({
  title: 'Workshops',
  description:
    'Bathong. workshops: learn analogue photography hands on, from pinhole cameras to the darkroom. All skill levels welcome.',
  image: nextWorkshop.value
    ? `/share/workshops.jpg?v=${nextWorkshop.value.updatedAt ? new Date(nextWorkshop.value.updatedAt).getTime() : 0}`
    : undefined,
  imageAlt: nextWorkshop.value
    ? `Announcement card for the next Bathong. workshop, ${formatWalkDate(nextWorkshop.value.date)}.`
    : undefined,
})
</script>

<template>
  <div>
    <template v-if="nextWorkshop && plate">
      <EventBlock :walk="plate" kind="workshop">
        <BButton v-if="rsvpOpen" href="#rsvp" variant="ghost">Reserve a place →</BButton>
        <BButton v-else-if="nextWorkshop.bookingUrl" :href="nextWorkshop.bookingUrl" variant="ghost">
          Reserve a place →
        </BButton>
        <p v-else class="b-caption">Bookings closed</p>
      </EventBlock>

      <section v-if="invite" v-reveal class="chapter">
        <ChapterHead title="The invite" />
        <WorkshopInvite :media="invite" :title="nextWorkshop.title" />
      </section>

      <!-- the practical lines answer the fear, on paper -->
      <section v-if="practicalLines.length || nextWorkshop.partner?.name" v-reveal class="chapter chapter--paper">
        <ChapterHead title="What to know" />
        <div class="what">
          <p v-for="(line, i) in practicalLines" :key="i" class="b-lede">{{ line }}</p>
          <p v-if="nextWorkshop.partner?.name" class="b-caption partner">
            With
            <a v-if="nextWorkshop.partner.url" :href="nextWorkshop.partner.url">{{ nextWorkshop.partner.name }}</a>
            <template v-else>{{ nextWorkshop.partner.name }}</template>
          </p>
        </div>
      </section>

      <section v-if="rsvpOpen" id="rsvp" v-reveal class="chapter">
        <ChapterHead title="Reserve a place" />
        <RsvpForm :workshop-id="nextWorkshop.id" />
      </section>
    </template>
    <section v-else class="chapter">
      <ChapterHead title="Workshops" />
      <p class="b-lede">No workshop is scheduled right now. The next date lands here first. TBC.</p>
    </section>

    <section v-if="futureWorkshops.length" v-reveal class="chapter">
      <ChapterHead title="After that" />
      <ul class="b-ruled">
        <li v-for="workshop in futureWorkshops" :key="workshop.id">
          <span class="num">{{ workshopNo(workshop) }}</span>
          <NuxtLink :to="workshopPath(workshop)" class="row-link">
            {{ workshop.title }}
            <small>{{ formatWalkDate(workshop.date) }} · {{ workshop.venueName ?? 'Venue TBC' }}</small>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <section v-if="pastWorkshops.length" v-reveal class="chapter">
      <ChapterHead title="From the last workshops" />
      <ul class="b-ruled">
        <li v-for="workshop in pastWorkshops" :key="workshop.id">
          <span class="num">{{ workshopNo(workshop) }}</span>
          <NuxtLink :to="workshopPath(workshop)" class="row-link">
            {{ workshop.title }}
            <small>
              {{ formatWalkDate(workshop.date) }}<template v-if="produced(workshop)"> · {{ produced(workshop) }}</template>
            </small>
          </NuxtLink>
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
.partner a {
  color: var(--signal);
}
.row-link {
  color: inherit;
  display: block;
}
.row-link:hover {
  color: var(--signal);
}
</style>

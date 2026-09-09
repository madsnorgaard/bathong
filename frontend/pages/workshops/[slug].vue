<script setup lang="ts">
/**
 * One workshop. Upcoming, it is the event: the jacaranda plate, the venue,
 * the practical lines, the RSVP. Held, it is the record: the facts on ink
 * and the snapshot galleries it produced. Nothing invented: a workshop with
 * no work yet says so in one line.
 */
import type { Workshop, Album, Media, Person } from '~/types/payload-types'

const route = useRoute()
const slug = route.params.slug as string

interface List<T> { docs: T[] }
type WorkshopDoc = Workshop & { spotsTaken?: number }

const { data } = await useCmsData<List<WorkshopDoc>>(
  `workshop-${slug}`,
  `/api/workshops?where[slug][equals]=${encodeURIComponent(slug)}&limit=1&depth=2&joins[albums][limit]=12&joins[albums][sort]=-date`,
)
const workshop = computed(() => data.value?.docs?.[0] ?? null)

if (!workshop.value) {
  throw createError({ statusCode: 404, statusMessage: 'Workshop not found', fatal: true })
}

const past = computed(() => isPastWalk(workshop.value!))
const isDoc = <T,>(v: T | number | string | null | undefined): v is T =>
  Boolean(v) && typeof v === 'object'
const albums = computed(() => (workshop.value?.albums?.docs ?? []).filter(isDoc<Album>))
const facilitators = computed(() =>
  (workshop.value?.facilitators ?? []).filter(
    (f): f is Person => Boolean(f) && typeof f === 'object',
  ),
)
const contact = computed(() =>
  workshop.value?.contact && typeof workshop.value.contact === 'object'
    ? workshop.value.contact
    : null,
)
const invite = computed(() =>
  workshop.value?.heroImage && typeof workshop.value.heroImage === 'object'
    ? workshop.value.heroImage
    : null,
)
const partners = computed(() => workshop.value?.partners ?? [])
const venueLine = computed(
  () =>
    [workshop.value?.venueName, workshop.value?.venueAddress].filter(Boolean).join(', ') || null,
)
const practicalLines = computed(
  () =>
    (workshop.value?.practicalInfo ?? [])
      .map((entry) => entry.line)
      .filter((line): line is string => Boolean(line)),
)

const plate = computed(() => ({
  ...workshop.value!,
  meetingPoint: venueLine.value,
  route: workshop.value!.description,
}))

const rsvpOpen = computed(
  () =>
    !past.value && !workshop.value?.bookingUrl && workshop.value?.bookingStatus !== 'closed',
)

function albumCover(album: Album): Media | null {
  const first = album.images?.[0]
  return first && typeof first === 'object' ? first : null
}
function albumCredit(album: Album): string {
  const p = album.photographer
  return album.creditOverride ?? (p && typeof p === 'object' ? p.name : null) ?? 'Bathong. Collective'
}

const description = computed(() => {
  const w = workshop.value!
  const when = formatWalkDate(w.date)
  const where = venueLine.value ? `, at ${venueLine.value}` : ''
  return past.value
    ? `${w.title}. A Bathong. workshop, ${when}${where}. What the workshop produced, credited.`
    : `${w.title}. A Bathong. workshop, ${when}${where}. All skill levels welcome.`
})

useShareMeta({
  title: workshop.value.title,
  description: description.value,
  image: `/share/workshop/${encodeURIComponent(slug)}.jpg?v=${workshop.value.updatedAt ? new Date(workshop.value.updatedAt).getTime() : 0}`,
  imageAlt: `Card for Bathong. workshop ${workshopNo(workshop.value)}, ${formatWalkDate(workshop.value.date)}.`,
})
</script>

<template>
  <div v-if="workshop">
    <!-- the record: held -->
    <template v-if="past">
      <section class="chapter head">
        <p class="b-kicker">Workshop · {{ workshopNo(workshop) }} · held</p>
        <h1 class="b-display-1">{{ workshop.title }}</h1>
        <dl class="facts b-caption">
          <div><dt>Date</dt><dd>{{ formatWalkDate(workshop.date) }}</dd></div>
          <div><dt>Start</dt><dd>{{ formatWalkTime(workshop.date) }}</dd></div>
          <div v-if="workshop.endTime"><dt>Wrapped</dt><dd>{{ formatWalkTime(workshop.endTime) }}</dd></div>
          <div v-if="venueLine"><dt>Venue</dt><dd>{{ venueLine }}</dd></div>
          <div v-if="partners.length">
            <dt>With</dt>
            <dd>{{ partners.map((p) => p.name).filter(Boolean).join(', ') }}</dd>
          </div>
          <div v-if="facilitators.length">
            <dt>Facilitated by</dt>
            <dd>
              <template v-for="(person, i) in facilitators" :key="person.id">
                <template v-if="i > 0">{{ i === facilitators.length - 1 ? ' and ' : ', ' }}</template>
                <NuxtLink v-if="person.slug" :to="`/photographers/${person.slug}`">{{ person.name }}</NuxtLink>
                <template v-else>{{ person.name }}</template>
              </template>
            </dd>
          </div>
        </dl>
        <ShareRow :title="workshop.title" />
      </section>

      <section v-if="invite" v-reveal class="chapter">
        <ChapterHead title="The invite" />
        <WorkshopInvite :media="invite" :title="workshop.title" />
      </section>

      <!-- the galleries are the record: what the workshop made -->
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
            <!-- whose gallery this is: a workshop carries a gallery per member -->
            <p class="b-caption">{{ albumCredit(album) }} · {{ album.images?.length ?? 0 }} photographs<template v-if="album.date"> · {{ formatWalkDate(album.date) }}</template></p>
          </NuxtLink>
        </div>
      </section>

      <section v-if="!albums.length" class="chapter">
        <p class="b-lede">Nothing published from this workshop yet.</p>
      </section>
    </template>

    <!-- the event: still to come, or happening now -->
    <template v-else>
      <EventBlock :walk="plate" kind="workshop">
        <BButton v-if="rsvpOpen" href="#rsvp" variant="ghost">Reserve a place →</BButton>
        <BButton v-else-if="workshop.bookingUrl" :href="workshop.bookingUrl" variant="ghost">Reserve a place →</BButton>
        <p v-else class="b-caption">Bookings closed</p>
      </EventBlock>

      <section v-if="invite" v-reveal class="chapter">
        <ChapterHead title="The invite" />
        <WorkshopInvite :media="invite" :title="workshop.title" />
      </section>

      <section v-if="practicalLines.length || partners.length || contact || facilitators.length" v-reveal class="chapter chapter--paper">
        <ChapterHead title="What to know" />
        <div class="what">
          <p v-for="(line, i) in practicalLines" :key="i" class="b-lede">{{ line }}</p>
          <p v-if="facilitators.length" class="b-caption meta">
            Facilitated by
            <template v-for="(person, i) in facilitators" :key="person.id">
              <template v-if="i > 0">{{ i === facilitators.length - 1 ? ' and ' : ', ' }}</template>
              <NuxtLink v-if="person.slug" :to="`/photographers/${person.slug}`">{{ person.name }}</NuxtLink>
              <template v-else>{{ person.name }}</template>
            </template>
          </p>
          <p v-if="contact" class="b-caption meta">
            Questions go to
            <NuxtLink v-if="contact.slug" :to="`/photographers/${contact.slug}`">{{ contact.name }}</NuxtLink>
            <template v-else>{{ contact.name }}</template>
          </p>
          <WorkshopPartners v-if="partners.length" :partners="partners" />
        </div>
      </section>

      <section class="chapter share">
        <ShareRow :title="workshop.title" />
      </section>

      <section v-if="rsvpOpen" id="rsvp" v-reveal class="chapter">
        <ChapterHead title="Reserve a place" />
        <RsvpForm :workshop-id="workshop.id" />
      </section>
    </template>

    <p class="b-kicker back"><NuxtLink to="/workshops">All workshops →</NuxtLink></p>
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
.what {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 62ch;
}
.meta a {
  color: var(--signal);
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
  .album-grid {
    grid-template-columns: 1fr;
  }
}
</style>

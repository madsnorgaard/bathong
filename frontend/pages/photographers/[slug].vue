<script setup lang="ts">
/**
 * The photographer page (W4): a photographer's front page, hosted by us.
 * Count row with real numbers only or it does not render. Essays first,
 * singles second as a contact-sheet run. The copyright line is a jacaranda
 * plate, on the record.
 */
import type { Person, Essay, Frame, SiteSetting } from '~/types/payload-types'

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
const [{ data: essaysData }, { data: framesData }, { data: walksData }, { data: settings }] =
  await Promise.all([
    useCmsData<List<Essay>>(
      `person-essays-${slug}`,
      `/api/essays?where[contributors][contains]=${personId}&sort=-publishedDate&limit=12&depth=2`,
    ),
    useCmsData<List<Frame>>(
      `person-frames-${slug}`,
      `/api/frames?where[photographer][equals]=${personId}&sort=-createdAt&limit=8&depth=1`,
    ),
    useCmsData<List<unknown>>(
      `person-walks-${slug}`,
      `/api/walks?where[leader][equals]=${personId}&limit=0`,
    ),
    useCmsData<SiteSetting>('site-settings', '/api/globals/site-settings'),
  ])

const essays = computed(() => essaysData.value?.docs ?? [])
const singles = computed(() => framesData.value?.docs ?? [])

// A count row, not a badge system: real numbers or the entry does not render.
const counts = computed(() =>
  [
    { label: 'Essays', n: essaysData.value?.totalDocs ?? 0 },
    {
      label: 'Frames in archive',
      n: framesData.value?.totalDocs ?? 0,
      to: `/archive?photographer=${encodeURIComponent(slug)}`,
    },
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
  description: `${person.value?.name} is a photographer with the Bathong. collective, Pretoria.`,
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
            sizes="xs:100vw md:33vw"
            class="card-frame"
          />
          <h3 class="b-display-2">{{ essay.title }}</h3>
        </NuxtLink>
      </div>
    </section>

    <section v-if="singles.length" v-reveal class="chapter">
      <ChapterHead title="Selected frames" />
      <!-- the contact sheet run: 8 up desktop, 3 up mobile -->
      <div class="sheet">
        <figure v-for="(frame, i) in singles" :key="frame.id" class="sheet-cell">
          <NuxtImg
            v-if="mediaSrc(frame.image as never)"
            :src="mediaSrc(frame.image as never)!"
            :alt="typeof frame.image === 'object' && frame.image?.alt ? frame.image.alt : ''"
            sizes="xs:33vw md:12vw"
            format="avif,webp"
            loading="lazy"
            class="sheet-img"
          />
          <figcaption class="b-caption">{{ String(i + 1).padStart(2, '0') }}</figcaption>
        </figure>
      </div>
    </section>

    <!-- the copyright plate, on the record -->
    <section class="plate on-jacaranda">
      <p class="b-lede">All work © {{ person.name }}. {{ licensingLine }}</p>
    </section>
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
/* the contact sheet: fixed row height, natural ratios - never crop to fill */
.sheet {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.sheet-cell {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sheet-img {
  height: 120px;
  width: auto;
  display: block;
  border: 1px solid var(--grey-line);
}
@media (max-width: 840px) {
  .sheet-img {
    height: 90px;
  }
}
.plate {
  padding: var(--space-5) var(--space-4);
}
.plate .b-lede {
  color: var(--paper);
}
@media (max-width: 840px) {
  .essay-grid {
    grid-template-columns: 1fr;
  }
  .sheet {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>

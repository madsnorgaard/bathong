<script setup lang="ts">
/**
 * The essay reader (W2): ink ground end to end, reader chrome instead of
 * site chrome, the end is a door - photographer credit, then the next essay,
 * never a grid. No grain over frames: real grain in the file beats fake
 * grain on top of it.
 */
import type { Essay, Walk } from '~/types/payload-types'

definePageMeta({ layout: 'reader' })

const route = useRoute()

interface List<T> { docs: T[] }

const slug = route.params.slug as string
const { data: essayData } = await useCmsData<List<Essay>>(
  `essay-${slug}`,
  `/api/essays?where[slug][equals]=${encodeURIComponent(slug)}&depth=2&limit=1`,
)
const essay = computed(() => essayData.value?.docs?.[0] ?? null)

if (!essay.value) {
  throw createError({ statusCode: 404, statusMessage: 'Essay not found', fatal: true })
}

const { data: nextData } = await useCmsData<List<Essay>>(
  `essay-next-${slug}`,
  `/api/essays?where[slug][not_equals]=${encodeURIComponent(slug)}&sort=-publishedDate&limit=1&depth=0`,
)
const nextEssay = computed(() => nextData.value?.docs?.[0] ?? null)

const author = computed(() => {
  const c = essay.value?.contributors?.[0]
  return c && typeof c === 'object' ? c : null
})
// The walks the essay came out of, populated at depth 2 (with their №).
const linkedWalks = computed(() =>
  (essay.value?.walks ?? []).filter((w): w is Walk => Boolean(w) && typeof w === 'object'),
)

// og:image is the generated C2 share card (server route); ?v busts the
// crawlers' per-URL caches when the essay is republished.
const shareImage = computed(() => {
  const e = essay.value
  if (!e?.slug) return undefined
  return `/share/essay/${e.slug}.jpg?v=${e.updatedAt ? new Date(e.updatedAt).getTime() : 0}`
})
const leadAlt = computed(() => {
  const lead = essay.value?.leadFrame
  return lead && typeof lead === 'object' && typeof lead.image === 'object'
    ? (lead.image?.alt ?? undefined)
    : undefined
})

useShareMeta({
  title: essay.value?.title ?? 'Essay',
  description:
    essay.value?.deck ??
    `A photo essay by the Bathong. collective${author.value?.name ? `, photographs by ${author.value.name}` : ''}.`,
  type: 'article',
  image: shareImage.value,
  imageAlt: leadAlt.value ?? essay.value?.deck ?? undefined,
  author: author.value?.name ?? undefined,
})

const progress = ref({ current: 1, total: 0 })
</script>

<template>
  <div v-if="essay" class="essay">
    <ReaderChrome :current="progress.current" :total="progress.total" close-to="/stories" />

    <header class="essay-head">
      <p class="b-kicker">{{ formatWalkDate(essay.publishedDate).replace('TBC', '') }}</p>
      <h1 class="b-display-1">{{ essay.title }}</h1>
      <p v-if="essay.deck" class="deck">{{ essay.deck }}</p>
    </header>

    <EssayReader
      :sequence="(essay.sequence ?? []) as never"
      @progress="(c, t) => (progress = { current: c, total: t })"
    />

    <!-- pass it on: the share row sits on ink, before the door -->
    <aside class="share">
      <ShareRow :title="essay.title" />
    </aside>

    <!-- the end is a door, never a grid -->
    <footer class="door">
      <div v-if="author" class="door-credit">
        <span class="b-credit">{{ author.name }}</span>
        <NuxtLink v-if="author.slug" :to="`/photographers/${author.slug}`" class="b-kicker">
          View all work →
        </NuxtLink>
      </div>
      <NuxtLink v-for="walk in linkedWalks" :key="walk.id" :to="walkPath(walk)" class="b-kicker from-walk">
        From walk {{ walkNo(walk) }}, {{ formatWalkDate(walk.date) }} →
      </NuxtLink>
      <NuxtLink v-if="nextEssay" :to="`/stories/${nextEssay.slug}`" class="next b-display-2">
        Next essay: {{ nextEssay.title }} →
      </NuxtLink>
      <NuxtLink v-else to="/stories" class="next b-display-2">All stories →</NuxtLink>
    </footer>
  </div>
</template>

<style scoped>
.essay-head {
  padding: var(--space-6) var(--space-4) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 60rem;
}
.essay-head .b-kicker {
  color: var(--grey-ghost);
}
.deck {
  font-size: var(--text-lede);
  color: var(--grey-fog);
  max-width: 62ch;
}
.share {
  padding: var(--space-5) var(--space-4);
  color: var(--grey-ghost);
}
.from-walk {
  color: var(--jacaranda-deep);
}
/* paper returns at the essay's end card */
.door {
  background: var(--paper);
  color: var(--ink);
  padding: var(--space-6) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.door-credit {
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
}
.door-credit a {
  color: var(--jacaranda-deep);
}
.next {
  color: var(--ink);
}
.next:hover {
  color: var(--jacaranda-deep);
}
</style>

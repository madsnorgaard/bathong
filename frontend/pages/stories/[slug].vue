<script setup lang="ts">
/**
 * The essay reader (W2): ink ground end to end, reader chrome instead of
 * site chrome, the end is a door - photographer credit, then the next essay,
 * never a grid. No grain over frames: real grain in the file beats fake
 * grain on top of it.
 */
import type { Essay } from '~/types/payload-types'

definePageMeta({ layout: 'reader' })

const route = useRoute()
const { public: { cmsUrl, siteUrl } } = useRuntimeConfig()

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

// og:image from the lead frame's 1200x630 JPEG rendition when it exists
const shareImage = computed(() => {
  const lead = essay.value?.leadFrame
  if (lead && typeof lead === 'object' && typeof lead.image === 'object' && lead.image) {
    const og = lead.image.sizes?.og?.url
    if (og) return `${cmsUrl.replace(/\/$/, '')}${og}`
  }
  return undefined
})
void siteUrl

useShareMeta({
  title: essay.value?.title ?? 'Essay',
  description:
    essay.value?.deck ??
    `A photo essay by the Bathong. collective${author.value?.name ? `, photographs by ${author.value.name}` : ''}.`,
  type: 'article',
  image: shareImage.value,
  imageAlt: essay.value?.deck ?? undefined,
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

    <!-- the end is a door, never a grid -->
    <footer class="door">
      <div v-if="author" class="door-credit">
        <span class="b-credit">{{ author.name }}</span>
        <NuxtLink v-if="author.slug" :to="`/photographers/${author.slug}`" class="b-kicker">
          View all work →
        </NuxtLink>
      </div>
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

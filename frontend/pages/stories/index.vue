<script setup lang="ts">
/**
 * Stories index (W3): the newest essay gets the asymmetric hero row so the
 * index always leads with an editorial decision; an even three-up grid
 * below; filters are words, five at most. Honest at one essay, honest at
 * four hundred.
 */
import type { Essay } from '~/types/payload-types'

interface List<T> { docs: T[] }
const route = useRoute()

const { data } = await useCmsData<List<Essay>>(
  'essays-index',
  '/api/essays?sort=-publishedDate&limit=40&depth=2',
)

// og:image is the generated card led by the newest essay's lead frame.
const newest = data.value?.docs?.[0]
const newestLead = newest && typeof newest.leadFrame === 'object' ? newest.leadFrame : null
useShareMeta({
  title: 'Stories',
  description:
    'Photo essays from the Bathong. collective: 12 to 20 sequenced frames, edited as a body, published as a story.',
  image: newest ? `/share/stories.jpg?v=${shareVersion(newest.updatedAt)}` : undefined,
  imageAlt: newest
    ? ((newestLead && typeof newestLead.image === 'object' ? newestLead.image?.alt : null) ??
      `The lead frame of the essay ${newest.title}.`)
    : undefined,
})

const activeTag = computed(() => (route.query.tag as string) ?? null)

const tags = computed(() => {
  const counts = new Map<string, number>()
  for (const essay of data.value?.docs ?? []) {
    for (const tag of essay.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag)
})

const essays = computed(() => {
  const all = data.value?.docs ?? []
  return activeTag.value ? all.filter((e) => e.tags?.includes(activeTag.value!)) : all
})

const hero = computed(() => essays.value[0] ?? null)
const rest = computed(() => essays.value.slice(1))

function leadSrc(essay: Essay): string | null {
  const lead = essay.leadFrame
  if (lead && typeof lead === 'object') return mediaSrc(lead.image as never)
  return null
}
// The card's link already says the title; the photograph says what it
// shows, or nothing when the file has no alt text in the CMS.
function leadAlt(essay: Essay): string {
  const lead = essay.leadFrame
  const image = lead && typeof lead === 'object' ? lead.image : null
  return image && typeof image === 'object' ? (image.alt ?? '') : ''
}
function leadCredit(essay: Essay): string {
  const lead = essay.leadFrame
  return lead && typeof lead === 'object' ? frameCredit(lead) : 'Bathong. Collective'
}
function frameCount(essay: Essay): number {
  return (essay.sequence ?? []).reduce(
    (n, b) => n + (b.blockType === 'frame' ? 1 : b.blockType === 'pair' ? 2 : 0),
    0,
  )
}
</script>

<template>
  <div class="chapter">
    <div class="head-row">
      <ChapterHead title="Stories" :level="1" />
      <nav v-if="tags.length > 1" class="filters b-kicker" aria-label="Filter stories">
        <NuxtLink to="/stories" :class="{ active: !activeTag }" :aria-current="!activeTag ? 'true' : undefined">all</NuxtLink>
        <NuxtLink
          v-for="tag in tags"
          :key="tag"
          :to="`/stories?tag=${encodeURIComponent(tag)}`"
          :class="{ active: activeTag === tag }"
          :aria-current="activeTag === tag ? 'true' : undefined"
        >
          {{ tag }}
        </NuxtLink>
      </nav>
    </div>

    <p v-if="!essays.length" class="b-lede">
      Essay 001 follows Walk № 001: the walk produces the frames, the group edit produces the
      story. TBC.
    </p>

    <!-- the newest essay leads, asymmetric. sizes: each key adds its width at
         1x and 2x to the srcset, and xs is 480, so without the 390 key a
         390px phone at 2x (asking for 780) finds nothing between 504w and
         960w and takes 960w for a 344px box. 390:100vw adds the 780w that
         fits it; lg and xl carry the 60vw column past 1008w on desktop. -->
    <NuxtLink v-if="hero" :to="`/stories/${hero.slug}`" class="hero">
      <BFrame
        :src="leadSrc(hero)"
        :alt="leadAlt(hero)"
        :credit="leadCredit(hero)"
        sizes="390:100vw xs:100vw md:60vw lg:60vw xl:60vw"
        class="hero-frame"
      />
      <div class="hero-meta">
        <h2 class="b-display-2">{{ hero.title }}</h2>
        <p v-if="hero.deck" class="deck">{{ hero.deck }}</p>
        <p class="b-caption">
          {{ frameCount(hero) }} frames · © {{ leadCredit(hero) }}
          <template v-if="hero.publishedDate"> · {{ formatWalkDate(hero.publishedDate) }}</template>
        </p>
        <span class="b-kicker read">Read →</span>
      </div>
    </NuxtLink>

    <!-- even grid below -->
    <div v-if="rest.length" class="grid">
      <NuxtLink v-for="essay in rest" :key="essay.id" :to="`/stories/${essay.slug}`" class="card">
        <BFrame
          :src="leadSrc(essay)"
          :alt="leadAlt(essay)"
          :credit="leadCredit(essay)"
          sizes="390:100vw xs:100vw md:33vw lg:33vw xl:33vw"
          class="card-frame"
        />
        <h3 class="b-display-2">{{ essay.title }}</h3>
        <p class="b-caption">{{ frameCount(essay) }} frames · © {{ leadCredit(essay) }}</p>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.head-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}
.filters {
  display: flex;
  gap: var(--space-3);
}
.filters a {
  color: var(--grey-ghost);
}
.filters a.active,
.filters a:hover {
  color: var(--signal);
}
.hero {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: var(--space-4);
  align-items: end;
  color: inherit;
  margin-bottom: var(--space-6);
}
.hero-frame,
.card-frame {
  border: 1px solid var(--grey-line);
}
.hero-meta {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.hero-meta .deck {
  color: var(--grey-fog);
  max-width: 48ch;
}
.hero:hover .b-display-2,
.card:hover .b-display-2 {
  color: var(--signal);
}
.read {
  color: var(--signal);
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4) var(--space-3);
}
.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  color: inherit;
}
@media (max-width: 840px) {
  /* a filter is a tap target on a phone */
  .filters a {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
  }
  .hero,
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>

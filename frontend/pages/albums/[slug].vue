<script setup lang="ts">
/**
 * One album: the head on ink (what, when, whose, from which walk), the
 * share row, then the run - photographs uncropped and credited, the alt text
 * as caption. No reader chrome: an album is looked through, not read.
 */
import type { Album, Media, Walk } from '~/types/payload-types'

const route = useRoute()
const slug = route.params.slug as string

interface List<T> { docs: T[] }

const { data } = await useCmsData<List<Album>>(
  `album-${slug}`,
  `/api/albums?where[slug][equals]=${encodeURIComponent(slug)}&limit=1&depth=2`,
)
const album = computed(() => data.value?.docs?.[0] ?? null)

if (!album.value) {
  throw createError({ statusCode: 404, statusMessage: 'Album not found', fatal: true })
}

const images = computed(() =>
  (album.value?.images ?? []).filter((m): m is Media => Boolean(m) && typeof m === 'object'),
)
const walks = computed(() =>
  (album.value?.walks ?? []).filter((w): w is Walk => Boolean(w) && typeof w === 'object'),
)
const photographer = computed(() =>
  album.value?.photographer && typeof album.value.photographer === 'object'
    ? album.value.photographer
    : null,
)
const credit = computed(
  () => album.value?.creditOverride ?? photographer.value?.name ?? 'Bathong. Collective',
)

useShareMeta({
  title: album.value.title,
  description:
    album.value.intro ??
    `${images.value.length} photographs from a Bathong. photowalk, by ${credit.value}.`,
  image: `/share/album/${encodeURIComponent(slug)}.jpg?v=${album.value.updatedAt ? new Date(album.value.updatedAt).getTime() : 0}`,
  imageAlt: images.value[0]?.alt ?? `Album card: ${album.value.title}.`,
  author: credit.value,
})
</script>

<template>
  <div v-if="album">
    <section class="chapter head">
      <p class="b-kicker">
        Album<template v-if="album.date"> · {{ formatWalkDate(album.date) }}</template>
      </p>
      <h1 class="b-display-1">{{ album.title }}</h1>
      <p v-if="album.intro" class="intro">{{ album.intro }}</p>
      <p class="b-caption byline">
        Photographs ©
        <NuxtLink v-if="photographer?.slug" :to="`/photographers/${photographer.slug}`">{{ credit }}</NuxtLink>
        <template v-else>{{ credit }}</template>
      </p>
      <p v-for="walk in walks" :key="walk.id" class="from-walk">
        <NuxtLink :to="walkPath(walk)" class="b-kicker">
          From walk {{ walkNo(walk) }}, {{ formatWalkDate(walk.date) }} →
        </NuxtLink>
      </p>
      <ShareRow :title="album.title" />
    </section>

    <section class="chapter run-chapter">
      <AlbumRun :images="images" :credit="credit" />
    </section>

    <p class="b-kicker back"><NuxtLink to="/albums">All albums →</NuxtLink></p>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 60rem;
}
.head .b-kicker {
  color: var(--grey-ghost);
}
.intro {
  font-size: var(--text-lede);
  color: var(--grey-fog);
  max-width: 62ch;
}
.byline {
  color: var(--grey-ghost);
}
.byline a {
  color: var(--paper);
}
.byline a:hover {
  color: var(--signal);
}
.from-walk {
  margin: 0;
}
.from-walk a {
  color: var(--signal);
}
.run-chapter {
  padding-top: 0;
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
</style>

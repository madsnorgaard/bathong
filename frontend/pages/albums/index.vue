<script setup lang="ts">
/**
 * Albums: the softer record of the walks. Group photographs, the edit
 * table, the coffee after. Plain media, credited like everything else,
 * never part of the archive. Newest first, honest at one album.
 */
import type { Album, Media } from '~/types/payload-types'

useShareMeta({
  title: 'Albums',
  description:
    'Albums from the Bathong. photowalks: the group, the edit table, the streets between frames. Every photograph credited.',
})

interface List<T> { docs: T[] }

const { data } = await useCmsData<List<Album>>(
  'albums-index',
  '/api/albums?sort=-date&limit=40&depth=1',
)
const albums = computed(() => data.value?.docs ?? [])

function cover(album: Album): Media | null {
  const first = album.images?.[0]
  return first && typeof first === 'object' ? first : null
}
function credit(album: Album): string {
  const p = album.photographer
  return album.creditOverride ?? (p && typeof p === 'object' ? p.name : null) ?? 'Bathong. Collective'
}
</script>

<template>
  <div class="chapter">
    <ChapterHead title="Albums" />
    <p v-if="!albums.length" class="b-lede">Albums follow walks. TBC.</p>
    <div v-else class="grid">
      <NuxtLink v-for="album in albums" :key="album.id" :to="`/albums/${album.slug}`" class="card">
        <BFrame
          :src="mediaSrc(cover(album) as never)"
          :alt="cover(album)?.alt ?? album.title"
          :credit="credit(album)"
          sizes="xs:100vw md:50vw lg:50vw xl:720px"
          class="card-frame"
        />
        <h2 class="b-display-2">{{ album.title }}</h2>
        <p class="b-caption">
          {{ album.images?.length ?? 0 }} photograph{{ (album.images?.length ?? 0) === 1 ? '' : 's' }}
          <template v-if="album.date"> · {{ formatWalkDate(album.date) }}</template>
        </p>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-5) var(--space-4);
}
.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  color: inherit;
}
.card:nth-child(even) {
  margin-top: var(--space-5);
}
.card:hover .b-display-2 {
  color: var(--signal);
}
.card-frame {
  border: 1px solid var(--grey-line);
}
@media (max-width: 840px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .card:nth-child(even) {
    margin-top: 0;
  }
}
</style>

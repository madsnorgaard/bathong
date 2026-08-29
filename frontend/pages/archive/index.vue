<script setup lang="ts">
/**
 * The archive (M6, #19): every published frame, credited, filterable by
 * photographer, year, tag and free text. Filters are words, not a sidebar.
 * All state lives in the URL so a filtered view is shareable and renders
 * server-side; the search form is a plain GET so it works without JS.
 * Thumbnails only - the data budget is the design.
 */
import type { ArchiveResponse } from '~/utils/archive'

useShareMeta({
  title: 'Archive',
  description:
    'Every published frame from the Bathong. collective, filterable by photographer, place, year and tag.',
})

const route = useRoute()
const filters = computed(() => archiveFilters(route.query))
const hasFilters = computed(() => Object.keys(filters.value).length > 0)

// Keyed on the API path so each filter combination has its own SSR payload
// and a client-side query change refetches rather than reusing stale data.
const { cms } = useCms()
const { data } = await useAsyncData<ArchiveResponse>(
  () => `archive-${archiveApiPath(route.query)}`,
  () => cms<ArchiveResponse>(archiveApiPath(route.query)),
  { watch: [() => route.query] },
)

const docs = computed(() => data.value?.docs ?? [])
const facets = computed(
  () => data.value?.facets ?? { photographers: [], walks: [], years: [], tags: [] },
)
const page = computed(() => data.value?.page ?? 1)
const totalPages = computed(() => data.value?.totalPages ?? 1)
const totalDocs = computed(() => data.value?.totalDocs ?? 0)
const tags = computed(() => facets.value.tags.slice(0, 12))

const searchText = ref(filters.value.q ?? '')
watch(() => filters.value.q, (q) => { searchText.value = q ?? '' })

/** ipx wants the relative /api/media path; the API hands back absolute urls. */
function thumbSrc(url: string | null): string | null {
  return mediaSrc(url ? { url } : null)
}
</script>

<template>
  <div class="chapter">
    <div class="head-row">
      <ChapterHead title="Archive" />
      <form class="search" method="get" action="/archive" @submit.prevent="navigateTo({ path: '/archive', query: archiveQuery(route.query, { q: searchText }) })">
        <BField v-model="searchText" label="Search" name="q" placeholder="caption, place, tag" />
        <input v-if="filters.photographer" type="hidden" name="photographer" :value="filters.photographer">
        <input v-if="filters.walk" type="hidden" name="walk" :value="filters.walk">
        <input v-if="filters.year" type="hidden" name="year" :value="filters.year">
        <input v-if="filters.tag" type="hidden" name="tag" :value="filters.tag">
        <BButton type="submit" variant="ghost" size="sm">Search →</BButton>
      </form>
    </div>

    <nav v-if="facets.photographers.length" class="filters b-kicker" aria-label="Filter by photographer">
      <NuxtLink :to="{ path: '/archive', query: archiveQuery(route.query, { photographer: undefined }) }" :class="{ active: !filters.photographer }">all</NuxtLink>
      <NuxtLink
        v-for="p in facets.photographers"
        :key="p.slug"
        :to="{ path: '/archive', query: archiveQuery(route.query, { photographer: filters.photographer === p.slug ? undefined : p.slug }) }"
        :class="{ active: filters.photographer === p.slug }"
      >
        {{ p.name }}
      </NuxtLink>
    </nav>
    <nav v-if="facets.walks.length || filters.walk" class="filters b-kicker" aria-label="Filter by walk">
      <NuxtLink
        v-for="w in facets.walks"
        :key="w.slug"
        :to="{ path: '/archive', query: archiveQuery(route.query, { walk: filters.walk === w.slug ? undefined : w.slug }) }"
        :class="{ active: filters.walk === w.slug }"
      >
        {{ walkNumber(w.number ?? 1) }} · {{ w.title }}
      </NuxtLink>
    </nav>
    <nav v-if="facets.years.length > 1 || filters.year" class="filters b-kicker" aria-label="Filter by year">
      <NuxtLink
        v-for="y in facets.years"
        :key="y.year"
        :to="{ path: '/archive', query: archiveQuery(route.query, { year: filters.year === String(y.year) ? undefined : String(y.year) }) }"
        :class="{ active: filters.year === String(y.year) }"
      >
        {{ y.year }}
      </NuxtLink>
    </nav>
    <nav v-if="tags.length" class="filters b-kicker" aria-label="Filter by tag">
      <NuxtLink
        v-for="t in tags"
        :key="t.tag"
        :to="{ path: '/archive', query: archiveQuery(route.query, { tag: filters.tag === t.tag ? undefined : t.tag }) }"
        :class="{ active: filters.tag === t.tag }"
      >
        {{ t.tag }}
      </NuxtLink>
    </nav>

    <p class="count b-caption">
      {{ totalDocs }} frame{{ totalDocs === 1 ? '' : 's' }}<template v-if="hasFilters"> · <NuxtLink to="/archive">clear filters</NuxtLink></template>
    </p>

    <p v-if="!docs.length" class="b-lede empty">
      Nothing under that yet. <NuxtLink to="/archive">Clear the filters ↑</NuxtLink>
    </p>

    <div v-else class="grid">
      <article v-for="frame in docs" :key="frame.id" class="cell">
        <component
          :is="frame.photographerSlug ? resolveComponent('NuxtLink') : 'div'"
          :to="frame.photographerSlug ? `/photographers/${frame.photographerSlug}` : undefined"
          class="cell-link"
        >
          <BFrame
            :src="thumbSrc(frame.thumb)"
            :alt="frame.alt ?? frame.caption ?? ''"
            sizes="xs:50vw md:25vw"
            class="cell-frame"
          />
        </component>
        <p class="b-caption credit">
          ©
          <NuxtLink v-if="frame.photographerSlug" :to="`/photographers/${frame.photographerSlug}`">{{ frame.credit }}</NuxtLink>
          <template v-else>{{ frame.credit ?? 'Bathong. Collective' }}</template>
        </p>
        <p v-if="frame.caption || frame.location || frame.year" class="b-caption meta">
          <template v-if="frame.caption">{{ frame.caption }}<br></template>
          <template v-if="frame.location">{{ frame.location }}</template>
          <template v-if="frame.location && frame.year"> · </template>
          <template v-if="frame.year">{{ frame.year }}</template>
        </p>
        <p v-if="frame.walkSlug" class="b-caption meta">
          <NuxtLink :to="`/walks/${frame.walkSlug}`">Walk {{ walkNumber(frame.walkNumber ?? 1) }} →</NuxtLink>
        </p>
      </article>
    </div>

    <nav v-if="totalPages > 1" class="pager b-kicker" aria-label="Archive pages">
      <NuxtLink v-if="page > 1" :to="{ path: '/archive', query: archivePage(route.query, page - 1) }">← Newer</NuxtLink>
      <span v-else />
      <span class="pages">{{ page }} / {{ totalPages }}</span>
      <NuxtLink v-if="page < totalPages" :to="{ path: '/archive', query: archivePage(route.query, page + 1) }">Older →</NuxtLink>
      <span v-else />
    </nav>
  </div>
</template>

<style scoped>
.head-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}
.search {
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
  max-width: 28rem;
}
.search > :first-child {
  flex: 1;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}
.filters a {
  color: var(--grey-ghost);
}
.filters a.active,
.filters a:hover {
  color: var(--signal);
}
.count {
  color: var(--grey-ghost);
  margin: var(--space-3) 0 var(--space-4);
}
.count a,
.empty a {
  color: var(--signal);
}
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4) var(--space-3);
}
.cell {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.cell-link {
  color: inherit;
  display: block;
}
.cell-frame {
  border: 1px solid var(--grey-line);
}
.credit a {
  color: inherit;
}
.credit a:hover {
  color: var(--signal);
}
.meta {
  color: var(--grey-ghost);
}
.meta a {
  color: inherit;
}
.meta a:hover {
  color: var(--signal);
}
.pager {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-6);
  padding-top: var(--space-3);
  border-top: 1px solid var(--grey-line);
}
.pager a {
  color: var(--signal);
}
.pages {
  color: var(--grey-ghost);
}
@media (max-width: 840px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>

<script setup lang="ts">
/**
 * The roster (W4's index): every member page is built to be sent to a
 * curator; this is the shelf they sit on. Staggered like the founding
 * circle on About.
 */
import type { Person } from '~/types/payload-types'

useShareMeta({
  title: 'Photographers',
  description: 'The Bathong. collective roster: street and documentary photographers, Pretoria.',
})

interface List<T> { docs: T[] }

const { data } = await useCmsData<List<Person>>(
  'people-roster',
  '/api/people?sort=order&limit=48&depth=1',
)
const people = computed(() => data.value?.docs ?? [])
</script>

<template>
  <div class="chapter">
    <ChapterHead title="Photographers" />
    <div class="roster">
      <NuxtLink
        v-for="(person, i) in people"
        :key="person.id"
        :to="`/photographers/${person.slug}`"
        class="person"
        :class="{ dropped: i % 2 === 1 }"
      >
        <BFrame
          :src="mediaSrc(person.portrait as never)"
          :alt="typeof person.portrait === 'object' && person.portrait?.alt ? person.portrait.alt : `Portrait of ${person.name}`"
          ratio="tall"
          sizes="xs:50vw md:25vw lg:25vw xl:25vw"
          class="portrait"
        />
        <h2 class="b-display-2">{{ person.name }}</h2>
        <p v-if="person.memberNumber" class="b-caption">
          Member № {{ String(person.memberNumber).padStart(4, '0') }}
        </p>
      </NuxtLink>
    </div>
    <p v-if="!people.length" class="b-lede">The roster opens with the founding circle. TBC.</p>
  </div>
</template>

<style scoped>
.roster {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  align-items: start;
}
.person {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  color: inherit;
}
.person.dropped {
  margin-top: var(--space-5);
}
.person:hover .b-display-2 {
  color: var(--signal);
}
.portrait {
  border: 1px solid var(--grey-line);
}
@media (max-width: 840px) {
  .roster {
    grid-template-columns: repeat(2, 1fr);
  }
  .person.dropped {
    margin-top: var(--space-4);
  }
}
</style>

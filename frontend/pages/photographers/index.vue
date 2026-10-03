<script setup lang="ts">
/**
 * The roster (W4's index): every member page is built to be sent to a
 * curator; this is the shelf they sit on. Staggered like the founding
 * circle on About.
 */
import type { Person } from '~/types/payload-types'

interface List<T> { docs: T[] }

// The roster is a choice: only profiles whose member switched it on.
const { data } = await useCmsData<List<Person>>(
  'people-roster',
  '/api/people?where[onRoster][equals]=true&sort=order&limit=48&depth=1',
)
const people = computed(() => data.value?.docs ?? [])

// og:image is the generated card led by a frame from the roster. Versioned
// on the newest profile edit; the card itself re-renders hourly.
useShareMeta({
  title: 'Photographers',
  description: 'The Bathong. collective roster: street and documentary photographers, starting from Pretoria.',
  image: people.value.length
    ? `/share/photographers.jpg?v=${Math.max(...people.value.map((p) => shareVersion(p.updatedAt)))}`
    : undefined,
  imageAlt: people.value.length
    ? 'A frame by a photographer on the Bathong. roster, credited on the card.'
    : undefined,
})
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
          sizes="xs:50vw md:25vw"
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

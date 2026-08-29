<script setup lang="ts">
/**
 * About, in the darkroom: the word (the dictionary card is ink-native), the
 * founding circle on ink, membership as the paper chapter, the record line.
 * No archive indices; B-numbering dropped, the benefits are a list, not a
 * sequence.
 */
import type { Person, Manifesto, Membership, SiteSetting } from '~/types/payload-types'

useShareMeta({
  title: 'About',
  description:
    'Bathong: what you say when you cannot believe what you are seeing. A street and documentary photography collective that starts in Pretoria, among the people.',
})

interface List<T> { docs: T[] }


const [{ data: manifesto }, { data: people }, { data: membership }, { data: settings }] =
  await Promise.all([
    useCmsData<Manifesto>('manifesto', '/api/globals/manifesto'),
    useCmsData<List<Person>>(
      'founding-circle',
      '/api/people?where[foundingCircle][equals]=true&sort=order&limit=12&depth=1',
    ),
    useCmsData<Membership>('membership', '/api/globals/membership'),
    useCmsData<SiteSetting>('site-settings', '/api/globals/site-settings'),
  ])

const senses = computed(() =>
  (manifesto.value?.senses ?? []).map((s) => s.text).filter((t): t is string => Boolean(t)),
)
const manifestoParagraphs = computed(() => richTextParagraphs(manifesto.value?.body as never))
const directors = computed(() => people.value?.docs ?? [])
const benefits = computed(() => membership.value?.benefits ?? [])
const contactEmail = computed(() => settings.value?.contactEmail || null)
// Join goes to the configured URL, else the mailbox; no button without either.
const joinHref = computed(
  () => membership.value?.joinUrl || (contactEmail.value ? `mailto:${contactEmail.value}` : null),
)

function personContact(person: Person): string | null {
  if (person.showContact && person.contactEmail) return person.contactEmail
  return contactEmail.value
}
</script>

<template>
  <div>
    <!-- the word -->
    <section class="chapter word">
      <DictionaryCard
        v-if="senses.length"
        :headword="manifesto?.headword ?? 'ba·thong'"
        :senses="senses"
      />
      <div v-reveal class="manifesto">
        <p v-for="(para, i) in manifestoParagraphs" :key="i" class="b-lede">{{ para }}</p>
      </div>
    </section>

    <!-- the directors -->
    <section v-reveal class="chapter">
      <ChapterHead title="The founding circle" />
      <div class="people">
        <article
          v-for="(person, i) in directors"
          :key="person.id"
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
          <NuxtLink :to="`/photographers/${person.slug}`" class="name-link">
            <h3 class="b-display-2">{{ person.name }}</h3>
          </NuxtLink>
          <p v-if="person.roleTitle" class="b-caption">{{ person.roleTitle }}</p>
          <a v-if="personContact(person)" :href="`mailto:${personContact(person)}`" class="b-caption contact">
            {{ personContact(person) }}
          </a>
        </article>
      </div>
      <p v-if="!directors.length" class="b-lede">The founding circle is being confirmed. TBC.</p>
    </section>

    <!-- membership: the paper chapter -->
    <section id="membership" v-reveal class="chapter chapter--paper">
      <ChapterHead title="Membership" />
      <ul class="b-ruled benefits">
        <li v-for="(benefit, i) in benefits" :key="i">
          <div>
            {{ benefit.title }}
            <small v-if="benefit.description">{{ benefit.description }}</small>
          </div>
        </li>
      </ul>
      <p class="b-lede price">
        One membership, one price. {{ formatPrice(membership?.joiningFee) }} to join, then
        {{ formatPrice(membership?.priceMonthly) }} a month or {{ formatPrice(membership?.priceAnnual) }} a year.
      </p>
      <p v-if="membership?.priceNote" class="b-caption note">{{ membership.priceNote }}</p>
      <p class="apply">
        Anyone can join.
        <template v-if="joinHref">Write to us, we send the details and your member number.</template>
        <template v-else>Joining opens with our mailbox. TBC.</template>
        <template v-if="membership?.openDoorNote"> {{ membership.openDoorNote }}</template>
      </p>
      <BButton v-if="joinHref" :href="joinHref" variant="signal">Join →</BButton>
    </section>

    <!-- the record -->
    <section v-reveal class="chapter">
      <ChapterHead title="On the record" />
      <p class="b-lede npc">
        Bathong. Collective is registering as a non-profit company (NPC) in South Africa.
        Registration number to follow. Photographers keep their copyright. Always.
      </p>
    </section>
  </div>
</template>

<style scoped>
.word {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: var(--space-5);
  align-items: start;
}
@media (max-width: 840px) {
  .word {
    grid-template-columns: 1fr;
  }
}
.manifesto {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.people {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  align-items: start;
}
@media (max-width: 840px) {
  .people {
    grid-template-columns: repeat(2, 1fr);
  }
}
.person {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.person.dropped {
  margin-top: var(--space-5);
}
.portrait {
  border: 1px solid var(--grey-line);
}
.contact {
  color: var(--signal);
}
.name-link {
  color: inherit;
}
.name-link:hover .b-display-2 {
  color: var(--signal);
}
.benefits {
  max-width: 44rem;
}
.price {
  margin-top: var(--space-4);
}
.note {
  margin-top: var(--space-2);
  color: var(--text-meta);
}
.apply {
  max-width: 62ch;
  margin: var(--space-2) 0 var(--space-3);
}
.npc {
  max-width: 62ch;
}
</style>

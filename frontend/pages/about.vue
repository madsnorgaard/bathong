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
    'Bathong: what you say when you cannot believe what you are seeing. A street and documentary photography collective from Pretoria, among the people.',
})

interface List<T> { docs: T[] }

const { public: { cmsUrl } } = useRuntimeConfig()

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
            :src="mediaUrl(person.portrait as never, cmsUrl)"
            :alt="typeof person.portrait === 'object' && person.portrait?.alt ? person.portrait.alt : `Portrait of ${person.name}`"
            ratio="tall"
            sizes="xs:50vw md:25vw"
            class="portrait"
          />
          <h3 class="b-display-2">{{ person.name }}</h3>
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
        {{ formatPrice(membership?.priceIndividual) }} ·
        {{ membership?.priceNote ?? 'Launch pricing announced soon' }}
      </p>
      <p class="apply">
        Membership is by application.
        <template v-if="contactEmail">Write to us and tell us where you shoot.</template>
        <template v-else>Applications open with our mailbox. TBC.</template>
      </p>
      <BButton v-if="contactEmail" :href="`mailto:${contactEmail}`" variant="signal">
        Become a member →
      </BButton>
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
.benefits {
  max-width: 44rem;
}
.price {
  margin-top: var(--space-4);
}
.apply {
  max-width: 62ch;
  margin: var(--space-2) 0 var(--space-3);
}
.npc {
  max-width: 62ch;
}
</style>

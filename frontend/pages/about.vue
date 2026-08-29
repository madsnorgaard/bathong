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
// Join goes to sign-up on the site (the desk when signed in), unless the
// global points it elsewhere.
const { isSignedIn } = useAuth()
const joinExternal = computed(() => membership.value?.joinUrl || null)
const joinTo = computed(() => (isSignedIn.value ? '/account' : '/account/sign-up'))

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
      <!-- the fee: three numbers as rows, the kicker under them -->
      <div class="fee" aria-label="The fee">
        <p class="b-kicker fee-head">One membership, one price</p>
        <dl class="fee-rows">
          <div>
            <dt class="b-caption">Join</dt>
            <dd><span class="amount">{{ formatPrice(membership?.joiningFee) }}</span><small class="b-caption">once</small></dd>
          </div>
          <div>
            <dt class="b-caption">Monthly</dt>
            <dd><span class="amount">{{ formatPrice(membership?.priceMonthly) }}</span><small class="b-caption">a month</small></dd>
          </div>
          <div>
            <dt class="b-caption">Annual</dt>
            <dd><span class="amount">{{ formatPrice(membership?.priceAnnual) }}</span><small class="b-caption">a year</small></dd>
          </div>
        </dl>
        <p v-if="membership?.priceNote" class="b-caption note">{{ membership.priceNote }}</p>
      </div>

      <!-- the door -->
      <div class="join">
        <p class="apply">
          Anyone can join. An account is free; membership is a plan and a card.
        </p>
        <BButton v-if="joinExternal" :href="joinExternal" variant="signal">Join →</BButton>
        <BButton v-else :to="joinTo" variant="signal">Join →</BButton>
      </div>

      <!-- the open door, on its own -->
      <aside v-if="membership?.openDoorNote" class="open-door">
        <p>{{ membership.openDoorNote }}</p>
      </aside>
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
/* the fee block: ruled rows on paper, the amount in display type */
.fee {
  margin-top: var(--space-5);
  max-width: 44rem;
}
.fee-head {
  color: var(--text-meta);
  margin-bottom: var(--space-3);
}
.fee-rows {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin: 0;
  border-top: var(--border-frame);
  border-bottom: var(--border-frame);
}
.fee-rows > div {
  padding: var(--space-3) var(--space-3) var(--space-3) 0;
  border-right: var(--hairline);
}
.fee-rows > div:last-child {
  border-right: 0;
}
.fee-rows > div + div {
  padding-left: var(--space-3);
}
.fee-rows dt {
  color: var(--text-meta);
}
.fee-rows dd {
  margin: var(--space-1) 0 0;
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.amount {
  font-family: var(--font-display);
  font-size: var(--text-display-2);
  line-height: var(--leading-display);
  text-transform: uppercase;
}
.fee-rows small {
  color: var(--text-meta);
}
.note {
  margin-top: var(--space-3);
  color: var(--text-meta);
  max-width: 62ch;
}
.join {
  margin-top: var(--space-5);
}
.apply {
  max-width: 62ch;
  margin: 0 0 var(--space-3);
}
/* the open door: one sentence, set apart by the jacaranda rule */
.open-door {
  margin-top: var(--space-5);
  padding-left: var(--space-3);
  border-left: 3px solid var(--jacaranda);
  max-width: 48ch;
  color: var(--text-muted);
}
.open-door p {
  margin: 0;
}
@media (max-width: 840px) {
  .fee-rows {
    grid-template-columns: 1fr;
  }
  .fee-rows > div {
    border-right: 0;
    border-bottom: var(--hairline);
    padding: var(--space-3) 0;
  }
  .fee-rows > div:last-child {
    border-bottom: 0;
  }
  .fee-rows > div + div {
    padding-left: 0;
  }
}
.npc {
  max-width: 62ch;
}
</style>

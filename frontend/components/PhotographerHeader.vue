<script setup lang="ts">
/**
 * W4: portrait at 4/5, member number, name, two-line bio, contact row.
 * Built to be sent to a curator on its own. Contact is the photographer's
 * choice; enquiries otherwise route to the collective address.
 */
import type { Person } from '~/types/payload-types'

const props = defineProps<{ person: Person; fallbackEmail?: string | null }>()

const bio = computed(() => richTextParagraphs(props.person.bio as never))
const email = computed(() =>
  props.person.showContact && props.person.contactEmail
    ? props.person.contactEmail
    : props.fallbackEmail ?? null,
)
</script>

<template>
  <header class="ph-head">
    <BFrame
      :src="mediaSrc(person.portrait as never)"
      :alt="typeof person.portrait === 'object' && person.portrait?.alt ? person.portrait.alt : `Portrait of ${person.name}`"
      ratio="tall"
      sizes="xs:100vw md:30vw"
      class="portrait"
      eager
    />
    <div class="meta">
      <p class="b-kicker line">
        <template v-if="person.memberNumber">Member № {{ String(person.memberNumber).padStart(4, '0') }} · </template>Pretoria
      </p>
      <h1 class="b-display-1">{{ person.name }}</h1>
      <p v-if="person.roleTitle" class="b-caption">{{ person.roleTitle }}</p>
      <p v-for="(para, i) in bio" :key="i" class="bio">{{ para }}</p>
      <div class="links b-kicker">
        <a v-if="email" :href="`mailto:${email}`">Contact →</a>
        <a v-if="person.instagram" :href="person.instagram" rel="noopener">Instagram →</a>
        <a v-if="person.website" :href="person.website" rel="noopener">Website →</a>
      </div>
    </div>
  </header>
</template>

<style scoped>
.ph-head {
  display: grid;
  grid-template-columns: 30% 1fr;
  gap: var(--space-5);
  align-items: start;
}
.portrait {
  border: 1px solid var(--grey-line);
}
.meta {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.line {
  color: var(--grey-ghost);
}
.bio {
  max-width: 62ch;
  color: var(--grey-fog);
}
.links {
  display: flex;
  gap: var(--space-4);
  margin-top: var(--space-2);
}
.links a {
  color: var(--signal);
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}
.links a:hover {
  color: var(--paper);
}
@media (max-width: 840px) {
  .ph-head {
    grid-template-columns: 1fr;
  }
}
</style>

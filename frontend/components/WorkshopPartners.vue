<script setup lang="ts">
/**
 * The organisations a workshop runs with. Logos sit on the paper ground
 * (chapter--paper) where they stay readable; each entry is the logo when
 * one exists, always the name, linked when a URL is set.
 */
import type { Workshop } from '~/types/payload-types'

type Partner = NonNullable<Workshop['partners']>[number]

const props = defineProps<{ partners: Partner[] }>()

const entries = computed(() =>
  props.partners
    .filter((p) => p.name)
    .map((p) => ({
      name: p.name as string,
      url: p.url ?? null,
      logoSrc: p.logo && typeof p.logo === 'object' ? mediaSrc(p.logo as never) : null,
      logoAlt:
        p.logo && typeof p.logo === 'object' && p.logo.alt ? p.logo.alt : `${p.name} logo`,
    })),
)
</script>

<template>
  <div v-if="entries.length" class="partners">
    <p class="b-kicker">With</p>
    <ul class="row">
      <li v-for="partner in entries" :key="partner.name">
        <component
          :is="partner.url ? 'a' : 'span'"
          :href="partner.url ?? undefined"
          :rel="partner.url ? 'noopener' : undefined"
          class="partner"
        >
          <img v-if="partner.logoSrc" :src="partner.logoSrc" :alt="partner.logoAlt" class="logo">
          <span class="b-caption name">{{ partner.name }}</span>
        </component>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.partners {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.partners .b-kicker {
  color: var(--grey-ghost);
}
.row {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3) var(--space-4);
}
.partner {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: inherit;
}
.logo {
  display: block;
  height: 56px;
  width: auto;
  max-width: 200px;
  object-fit: contain;
}
a.partner:hover .name {
  color: var(--signal);
}
</style>

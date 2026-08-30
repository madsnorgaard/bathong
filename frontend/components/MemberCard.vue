<script setup lang="ts">
/**
 * The membership card: ink, the mark, a jacaranda offset shadow (the design
 * system's MemberCard, ported). Three honest states: a member with a
 * number, a payment pending on a reference, and no card yet. Carries the
 * mark, never the voice, and the NPC footnote.
 */
const props = defineProps<{
  state: 'member' | 'pending' | 'none'
  name: string
  number?: number | null
  plan?: string | null
  since?: string | null
  basedIn?: string | null
  reference?: string | null
}>()

const line = computed(() => {
  if (props.state === 'member' && props.number) {
    return [`Member ${memberNumberLabel(props.number)}`, props.basedIn].filter(Boolean).join(' · ')
  }
  if (props.state === 'pending') return `Payment pending · ${props.reference ?? 'reference to follow'}`
  return 'No card yet'
})
const detail = computed(() => {
  if (props.state !== 'member') return null
  const since = sinceLabel(props.since)
  return [planLabel(props.plan), since ? `since ${since}` : null].filter(Boolean).join(' · ')
})
</script>

<template>
  <div class="b-card--member card" :data-state="state">
    <Wordmark class="mark" />
    <p class="card-line">{{ line }}</p>
    <p class="name">{{ name }}</p>
    <p v-if="detail" class="card-line detail">{{ detail }}</p>
    <p v-else-if="state === 'pending'" class="card-line detail">
      <NuxtLink to="/account/join">How to pay →</NuxtLink>
    </p>
    <div v-else class="cta">
      <p class="card-line detail">Join the collective.</p>
      <BButton to="/account/join" variant="signal">Join →</BButton>
    </div>
    <p class="card-line foot">Membership cards supported by the Press Club NPC</p>
  </div>
</template>

<style scoped>
.card {
  max-width: 26rem;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.card :deep(.b-mark) {
  font-size: 1.9rem;
  color: var(--paper);
}
.name {
  font-family: var(--font-display);
  font-size: 2rem;
  line-height: var(--leading-display);
  text-transform: uppercase;
  letter-spacing: var(--track-tight);
  margin: var(--space-3) 0 0;
}
.detail {
  color: var(--signal);
}
.detail a {
  color: var(--signal);
}
.cta {
  margin-top: var(--space-3);
}
.foot {
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--grey-line);
}
</style>

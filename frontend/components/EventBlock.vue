<script setup lang="ts">
/**
 * The walk chapter: a full-bleed jacaranda plate where the date is the
 * headline, set enormous (the C4 share-card language). Everything a person
 * needs to decide in eight seconds, then exactly one CTA (the default slot,
 * a bookingUrl link, or the walks page).
 */
interface WalkLike {
  title?: string
  date?: string | null
  endTime?: string | null
  meetingPoint?: string | null
  capacity?: number | null
  spotsTaken?: number | null
  priceMember?: number | null
  priceNonMember?: number | null
  bookingUrl?: string | null
  bookingStatus?: 'open' | 'full' | 'closed' | null
  route?: unknown
}

const props = defineProps<{
  walk: WalkLike
  walkIndex: number
}>()

const spotsLine = computed(() => {
  const { capacity, spotsTaken, bookingStatus } = props.walk
  if (bookingStatus === 'closed') return 'Bookings closed'
  if (bookingStatus === 'full') return 'Walk is full'
  if (capacity == null) return null
  const left = Math.max(0, capacity - (spotsTaken ?? 0))
  if (left === 0) return 'Walk is full'
  return `${left} of ${capacity} places left`
})

const priceLine = computed(() => {
  const member = props.walk.priceMember
  const memberPart = member === 0 ? 'free for members' : `${formatPrice(member)} for members`
  return `${memberPart} · ${formatPrice(props.walk.priceNonMember)} for guests`
})

const routeParagraphs = computed(() => richTextParagraphs(props.walk.route as never))
</script>

<template>
  <section class="event on-jacaranda" :aria-label="`Walk ${walkIndex}`">
    <p class="b-kicker">Next walk · {{ walkNumber(walkIndex) }}</p>
    <p class="when b-display-1">
      {{ formatWalkDate(walk.date) }}<br>{{ formatWalkTime(walk.date) }}
    </p>
    <p v-if="walk.meetingPoint" class="b-caption meet">{{ walk.meetingPoint }}</p>
    <p v-for="(para, i) in routeParagraphs" :key="i" class="route">{{ para }}</p>
    <p class="b-caption meta-line">
      <template v-if="spotsLine">{{ spotsLine }} · </template>{{ priceLine }}
    </p>
    <div class="cta">
      <slot>
        <BButton v-if="walk.bookingUrl" :href="walk.bookingUrl" variant="ghost">
          Reserve a place →
        </BButton>
        <BButton v-else to="/walks" variant="ghost">Reserve a place →</BButton>
      </slot>
    </div>
  </section>
</template>

<style scoped>
.event {
  padding: var(--space-6) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.event .b-kicker {
  color: color-mix(in srgb, var(--paper) 80%, transparent);
}
.event .b-caption {
  color: var(--paper);
}
.when {
  color: var(--paper);
  max-width: 14ch;
}
.route {
  max-width: 62ch;
}
.cta {
  margin-top: var(--space-3);
}
/* ghost button reads paper on jacaranda; .on-ink's signal link color is too
   loud against the identity plate */
.cta :deep(.b-btn--ghost) {
  color: var(--paper);
  border-color: var(--paper);
}
.cta :deep(.b-btn--ghost:hover) {
  background: var(--ink);
  color: var(--paper);
}
</style>

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

const routeBlocks = computed(() => richTextBlocks(props.walk.route as never))
</script>

<template>
  <section class="event on-jacaranda" :aria-label="`Walk ${walkIndex}`">
    <p class="b-kicker">Next walk · {{ walkNumber(walkIndex) }}</p>
    <p class="when b-display-1">
      {{ formatWalkDate(walk.date) }}<br>{{ formatWalkTime(walk.date) }}
    </p>
    <p v-if="walk.meetingPoint" class="b-caption meet">{{ walk.meetingPoint }}</p>
    <!-- the description reads as a print stacked on the plate: ink on paper -->
    <div v-if="routeBlocks.length" class="route-card">
      <template v-for="(block, i) in routeBlocks" :key="i">
        <component
          :is="block.type === 'list' && block.ordered ? 'ol' : 'ul'"
          v-if="block.type === 'list'"
          class="route route-list"
        >
          <li v-for="(item, j) in block.items" :key="j">{{ item }}</li>
        </component>
        <p v-else-if="block.type === 'p'" class="route">{{ block.text }}</p>
      </template>
    </div>
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
/* Ink on paper (16:1) for the long copy; the jacaranda plate carries the
   date, furniture and CTA. Hard print shadow per the structure rules. */
.route-card {
  background: var(--paper);
  color: var(--ink);
  border: var(--border-frame);
  box-shadow: var(--shadow-print);
  padding: var(--space-4);
  max-width: 62ch;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  /* keep the 10px offset shadow clear of the meta line below */
  margin: 0 10px 10px 0;
}
.route {
  max-width: 62ch;
}
.route-list {
  margin: 0;
  padding-left: 1.2em;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
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

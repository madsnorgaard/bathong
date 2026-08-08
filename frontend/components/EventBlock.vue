<script setup lang="ts">
/**
 * The walk block (W1 annotation 4, W5 annotation 1): date, time, meeting
 * point, capacity, price, one CTA. variant="block" is the compact jacaranda
 * tile on home; variant="lead" is the walks page's full plate.
 * Exactly one CTA: the default slot, or a bookingUrl link, or a /walks link.
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

const props = withDefaults(
  defineProps<{
    walk: WalkLike
    walkIndex: number
    variant?: 'block' | 'lead'
  }>(),
  { variant: 'block' },
)

const spotsLine = computed(() => {
  const { capacity, spotsTaken, bookingStatus } = props.walk
  if (bookingStatus === 'closed') return 'Bookings closed'
  if (bookingStatus === 'full') return 'Walk is full'
  if (capacity == null) return null
  const taken = spotsTaken ?? 0
  const left = Math.max(0, capacity - taken)
  if (left === 0) return 'Walk is full'
  return `${left} of ${capacity} places left`
})

const priceLine = computed(() => {
  const member = props.walk.priceMember
  const guest = props.walk.priceNonMember
  const memberPart = member === 0 ? 'free for members' : `${formatPrice(member)} for members`
  const guestPart = `${formatPrice(guest)} for guests`
  return `${memberPart} · ${guestPart}`
})

const routeParagraphs = computed(() =>
  props.variant === 'lead' ? richTextParagraphs(props.walk.route as never) : [],
)
</script>

<template>
  <section class="event on-jacaranda" :class="variant" :aria-label="`Walk ${walkIndex}`">
    <p class="b-kicker line-index">Walk {{ walkNumber(walkIndex) }}</p>
    <p class="when" :class="variant === 'lead' ? 'b-display-2' : ''">
      {{ formatWalkDate(walk.date) }} · {{ formatWalkTime(walk.date) }}
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
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.event.lead {
  padding: var(--space-5) var(--space-4);
  gap: var(--space-3);
}
.on-jacaranda .b-caption {
  color: var(--paper);
}
.line-index {
  color: var(--paper);
}
.when {
  font-weight: 700;
}
.route {
  max-width: 62ch;
}
.cta {
  margin-top: var(--space-2);
}
</style>

<script setup lang="ts">
/**
 * Home, in the darkroom: one lead frame, the walk as a full-bleed jacaranda
 * chapter with the date set enormous, the feed staggered on ink, membership
 * as a paper chapter. Structure is carried by scale and plate changes, not
 * furniture; the only numbering is the walk's real №.
 */
import type { Frame, Walk, SiteSetting } from '~/types/payload-types'


useShareMeta({
  description:
    'Bathong is a street and documentary photography collective from Pretoria. Building photographers, publishing photo stories, and putting the capital on walls.',
})

interface List<T> { docs: T[] }

const [{ data: frames }, { data: topPicks }, { data: nextWalk }, { data: settings }] =
  await Promise.all([
    useCmsData<List<Frame>>('frames-latest', '/api/frames?limit=7&sort=-createdAt&depth=1'),
    useCmsData<List<Frame>>(
      'frames-top-picks',
      '/api/frames?where[topPick][equals]=true&limit=24&sort=-createdAt&depth=1',
    ),
    useCmsData<List<Walk & { spotsTaken?: number }>>(
      'walks-next',
      `/api/walks?where[date][greater_than_equal]=${new Date().toISOString()}&sort=date&limit=1&depth=0`,
    ),
    useCmsData<SiteSetting>('site-settings', '/api/globals/site-settings'),
  ])

// The lead rotates among editors' top picks, one per visit. The random seed
// lives in useState so the server's choice survives hydration unchanged.
const leadSeed = useState('lead-pick-seed', () => Math.random())
const leadFrame = computed(() => {
  const picks = topPicks.value?.docs ?? []
  if (picks.length) return picks[Math.floor(leadSeed.value * picks.length)] ?? picks[0]
  return frames.value?.docs?.[0] ?? null
})
const feedFrames = computed(() =>
  (frames.value?.docs ?? []).filter((f) => f.id !== leadFrame.value?.id).slice(0, 6),
)
const walk = computed(() => nextWalk.value?.docs?.[0] ?? null)
const tickerItems = computed(() =>
  (settings.value?.ticker ?? []).map((t) => t.text).filter((t): t is string => Boolean(t)),
)
</script>

<template>
  <div>
    <!-- one lead frame, full bleed, credited -->
    <section class="lead">
      <BFrame
        :src="leadFrame ? mediaSrc(leadFrame.image as never) : null"
        :alt="leadFrame && typeof leadFrame.image === 'object' ? leadFrame.image?.alt ?? '' : ''"
        ratio="wide"
        :credit="leadFrame ? frameCredit(leadFrame) : 'Bathong. Collective'"
        :place="leadFrame?.location ?? undefined"
        eager
        sizes="xs:100vw md:100vw lg:100vw xl:1440px"
        class="lead-frame"
      />
    </section>

    <!-- the walk: the one jacaranda chapter -->
    <EventBlock v-if="walk" :walk="walk" :walk-index="1">
      <BButton to="/walks" variant="ghost">Reserve a place →</BButton>
    </EventBlock>

    <!-- the feed on ink, staggered -->
    <section v-if="feedFrames.length" v-reveal class="chapter">
      <ChapterHead title="The feed" />
      <p class="b-caption feed-note">
        Single frames from the collective · Essay 001 follows the first walk
      </p>
      <FeedGrid :frames="feedFrames" />
    </section>

    <!-- membership: a paper chapter in the darkroom -->
    <section v-reveal class="chapter chapter--paper">
      <ChapterHead title="Become a member" />
      <p class="b-lede">
        {{ formatPrice(null) }} · Launch pricing announced soon. Walks, the group edit, the wall.
        You keep your copyright. Always.
      </p>
      <div class="member-cta">
        <BButton to="/about#membership" variant="ghost">How membership works →</BButton>
      </div>
    </section>

    <BTicker :items="tickerItems" />
  </div>
</template>

<style scoped>
.lead-frame {
  border: 0;
}
.feed-note {
  margin: calc(-1 * var(--space-4)) 0 var(--space-5);
}
.member-cta {
  margin-top: var(--space-4);
}
</style>

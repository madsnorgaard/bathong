<script setup lang="ts">
/**
 * Home (W1): one lead frame, the live blocks in Thabo's order of need
 * (walk / photocall / membership), stories holding state, the feed, the
 * ticker. Editorially assembled; every empty state is an honest placeholder.
 */
import type { Frame, Walk, SiteSetting } from '~/types/payload-types'

const { public: { cmsUrl } } = useRuntimeConfig()

useShareMeta({
  description:
    'Bathong is a street and documentary photography collective from Pretoria. Building photographers, publishing photo stories, and putting the capital on walls.',
})

interface List<T> { docs: T[] }

const [{ data: frames }, { data: nextWalk }, { data: settings }] = await Promise.all([
  useCmsData<List<Frame>>('frames-latest', '/api/frames?limit=7&sort=-createdAt&depth=1'),
  useCmsData<List<Walk & { spotsTaken?: number }>>(
    'walks-next',
    `/api/walks?where[date][greater_than_equal]=${new Date().toISOString()}&sort=date&limit=1&depth=0`,
  ),
  useCmsData<SiteSetting>('site-settings', '/api/globals/site-settings'),
])

const leadFrame = computed(() => frames.value?.docs?.[0] ?? null)
const feedFrames = computed(() => frames.value?.docs?.slice(1, 7) ?? [])
const walk = computed(() => nextWalk.value?.docs?.[0] ?? null)
const tickerItems = computed(() =>
  (settings.value?.ticker ?? []).map((t) => t.text).filter((t): t is string => Boolean(t)),
)
</script>

<template>
  <div>
    <!-- 2: one lead frame, 21/9, full bleed, credit bottom-left -->
    <section class="lead full-bleed">
      <BFrame
        :src="leadFrame ? mediaUrl(leadFrame.image as never, cmsUrl) : null"
        :alt="leadFrame && typeof leadFrame.image === 'object' ? leadFrame.image?.alt ?? '' : ''"
        ratio="wide"
        :credit="leadFrame ? frameCredit(leadFrame) : 'Bathong. Collective'"
        :place="leadFrame?.location ?? undefined"
        eager
        sizes="100vw"
        :max-width="1920"
        class="lead-frame"
      />
    </section>

    <!-- 4: the three live blocks, walk / photocall / membership -->
    <section v-reveal class="live section">
      <EventBlock v-if="walk" :walk="walk" :walk-index="1">
        <BButton to="/walks" variant="ghost">RSVP →</BButton>
      </EventBlock>
      <div v-else class="live-tile on-jacaranda">
        <p class="b-kicker">Next walk</p>
        <p class="b-lede">TBC</p>
      </div>
      <div class="live-tile recessed">
        <p class="b-kicker">Photocall</p>
        <p class="b-lede">Photocall 001 opens after the first walk. TBC.</p>
      </div>
      <div class="live-tile ghost">
        <p class="b-kicker">Membership</p>
        <p class="b-lede">{{ formatPrice(null) }} · Launch pricing announced soon</p>
        <BButton to="/about#membership" variant="ghost">Become a member →</BButton>
      </div>
    </section>

    <!-- 5: recent essays; honest holding state until Essay 001 exists -->
    <section v-reveal class="section">
      <SectionHead :index="2" title="Stories" />
      <p class="b-lede">
        Walk № 001 produces the frames. The group edit produces Essay 001. The reader is being
        built for it. TBC.
      </p>
    </section>

    <!-- 6: the feed, six credited frames -->
    <section v-if="feedFrames.length" v-reveal class="section">
      <SectionHead :index="3" title="The feed" />
      <FeedGrid :frames="feedFrames" />
    </section>

    <BTicker :items="tickerItems" />
  </div>
</template>

<style scoped>
.section {
  padding: var(--space-6) var(--space-4);
}
.lead-frame {
  border-left: 0;
  border-right: 0;
}
.live {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: var(--space-3);
}
@media (max-width: 840px) {
  .live {
    grid-template-columns: 1fr;
  }
}
.live-tile {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.live-tile.recessed {
  background: var(--surface-recessed);
}
.live-tile.ghost {
  border: var(--border-frame);
}
</style>

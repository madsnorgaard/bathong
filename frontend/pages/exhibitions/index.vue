<script setup lang="ts">
/**
 * Exhibitions: the wall. What is on now and what is coming lead, each as a
 * split: the photograph whole on ink, a jacaranda plate beside it carrying
 * the title, the dates and the venue (the share-card split at page size).
 * The record follows, staggered and uncropped. With nothing published the
 * page says so on paper and invents no date.
 */
import type { Exhibition } from '~/types/payload-types'

interface List<T> { docs: T[] }

const { data } = await useCmsData<List<Exhibition>>('exhibitions-index', exhibitionsQuery(40))

// One clock for server and browser, so the split between now and the record
// cannot change under hydration.
const now = useState('exhibitions-now', () => Date.now())

function view(exhibition: Exhibition) {
  const lead = exhibitionLead(exhibition)
  const { width, height } = lead?.media ?? {}
  return {
    doc: exhibition,
    lead,
    // the file's own shape, so the photograph is seen whole; 3/2 until the file says otherwise
    ratio: width && height ? width / height : 1.5,
    phase: exhibitionPhase(exhibition, now.value),
    dateLines: exhibitionDateLines(exhibition),
  }
}
type View = ReturnType<typeof view>

const ordered = computed(() => orderExhibitions(data.value?.docs ?? [], now.value))
const live = computed(() => ordered.value.live.map(view))
const past = computed(() => ordered.value.past.map(view))

// The record's stagger (wide/narrow alternating); a portrait always takes
// the narrow cell, so it is never taller than the screen it is seen on.
function span(item: View, i: number): 'wide' | 'narrow' {
  if (item.ratio < 1) return 'narrow'
  return i % 4 === 0 || i % 4 === 3 ? 'wide' : 'narrow'
}

// og:image is the generated card led by the first exhibition that has a
// photograph, in the order the page shows them.
const card = [...live.value, ...past.value].find((item) => item.lead) ?? null
useShareMeta({
  title: 'Exhibitions',
  description:
    'Exhibitions by the Bathong. collective: where the frames hang, when, and whose they are. Every photograph credited.',
  image: card ? `/share/exhibitions.jpg?v=${shareVersion(card.doc.updatedAt)}` : undefined,
  imageAlt: card
    ? (card.lead?.media.alt ?? `A photograph from the exhibition ${card.doc.title}.`)
    : undefined,
})
</script>

<template>
  <div>
    <section class="chapter head">
      <ChapterHead title="Exhibitions" :level="1" />
      <p class="b-lede">An essay earns a wall. A wall makes a photographer.</p>
      <p v-if="past.length && !live.length" class="b-caption between">
        Nothing is on the wall right now. The next dates land here first. TBC.
      </p>
    </section>

    <!-- on now, then coming up: the photograph whole, the plate beside it -->
    <NuxtLink
      v-for="(item, i) in live"
      :key="item.doc.id"
      :to="exhibitionPath(item.doc)"
      class="feature"
      :class="{ flipped: i % 2 === 1, bare: !item.lead }"
    >
      <div v-if="item.lead" class="feature-work">
        <figure class="work" :style="{ '--ratio': item.ratio }">
          <NuxtPicture
            :src="mediaSrc(item.lead.media)!"
            :alt="item.lead.media.alt ?? item.doc.title"
            :width="item.lead.media.width ?? undefined"
            :height="item.lead.media.height ?? undefined"
            sizes="390:100vw xs:100vw md:60vw lg:60vw xl:1120px"
            format="avif,webp"
            :loading="i === 0 ? 'eager' : 'lazy'"
            :preload="i === 0"
            :img-attrs="{ class: 'work-img' }"
          />
          <FrameCaption standalone :credit="item.lead.credit" />
        </figure>
      </div>
      <div class="feature-plate on-jacaranda">
        <p><BTag :variant="item.phase === 'current' ? 'signal' : 'ink'">{{ exhibitionPhaseLabel(item.phase) }}</BTag></p>
        <h2 class="b-display-1 feature-title">{{ item.doc.title }}</h2>
        <div class="feature-facts">
          <p class="b-display-2 when">
            <span v-for="(line, n) in item.dateLines" :key="n" class="line">{{ line }}</span>
          </p>
          <p class="b-display-2 where">{{ item.doc.venue ?? 'Venue TBC' }}</p>
        </div>
        <span class="b-btn b-btn--ghost door">See the exhibition →</span>
      </div>
    </NuxtLink>

    <!-- the record: what has hung, newest first -->
    <section v-if="past.length" v-reveal class="chapter">
      <ChapterHead title="Past exhibitions" />
      <div class="record">
        <NuxtLink
          v-for="(item, i) in past"
          :key="item.doc.id"
          :to="exhibitionPath(item.doc)"
          class="cell"
          :class="[span(item, i), { dropped: i % 2 === 1 }]"
        >
          <figure v-if="item.lead" class="work">
            <NuxtPicture
              :src="mediaSrc(item.lead.media)!"
              :alt="item.lead.media.alt ?? item.doc.title"
              :width="item.lead.media.width ?? undefined"
              :height="item.lead.media.height ?? undefined"
              sizes="390:100vw xs:100vw md:60vw lg:60vw xl:900px"
              format="avif,webp"
              loading="lazy"
              :img-attrs="{ class: 'work-img' }"
            />
            <FrameCaption standalone :credit="item.lead.credit" />
          </figure>
          <h3 class="b-display-2">{{ item.doc.title }}</h3>
          <p class="b-caption">
            {{ item.doc.venue ?? 'Venue TBC' }} · {{ item.dateLines.join(' ') }}
          </p>
        </NuxtLink>
      </div>
    </section>

    <!-- nothing published: said plainly, on paper, with the doors that are open -->
    <section v-if="!live.length && !past.length" class="chapter chapter--paper empty">
      <p class="b-display-1 empty-line">Nothing is on the wall yet<span class="stop">.</span></p>
      <div class="empty-words">
        <p class="b-lede">
          No exhibition has been announced. When one is, its venue and its dates land here first. TBC.
        </p>
        <p class="b-lede">Member work is first in line for exhibitions.</p>
      </div>
      <ul class="b-ruled doors">
        <li>
          <NuxtLink to="/stories" class="row-link">
            Read the essays →
            <small>Where the frames are sequenced before they are hung</small>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink to="/archive" class="row-link">
            Walk the archive →
            <small>Every published frame, credited</small>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink to="/about#membership" class="row-link">
            How membership works →
            <small>The wall is one of the things it is for</small>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.head {
  padding-bottom: var(--space-5);
}
.head :deep(.chapter-head) {
  margin-bottom: var(--space-4);
}
.head .b-lede {
  color: var(--grey-fog);
}
.between {
  margin-top: var(--space-4);
}

/* the split: photograph on ink, plate on jacaranda, one door */
.feature {
  display: grid;
  grid-template-columns: 7fr 5fr;
  color: inherit;
}
.feature + .feature {
  margin-top: var(--space-5);
}
.feature.flipped {
  grid-template-columns: 5fr 7fr;
}
.feature.flipped .feature-work {
  order: 2;
  justify-content: flex-start;
}
.feature.bare {
  grid-template-columns: 1fr;
}
.feature-work {
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  min-width: 0;
}
/* seen whole or not at all: the width follows the file's ratio, capped by the screen's height */
.feature .work {
  width: min(100%, calc(82vh * var(--ratio)));
}
.work {
  margin: 0;
}
.work :deep(picture) {
  display: block;
}
/* the 2px ink frame is invisible on ink; hairline instead, and no crop */
.work :deep(.work-img) {
  display: block;
  width: 100%;
  height: auto;
  border: 1px solid var(--grey-line);
  border-bottom: 0;
}
/* the plate hangs lower than the photograph: the stagger, at the size of the page */
.feature-plate {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-5);
  padding: var(--space-5) var(--space-4);
  margin-top: var(--space-5);
  min-width: 0;
}
.feature.bare .feature-plate {
  margin-top: 0;
}
.feature-title {
  color: var(--paper);
  overflow-wrap: anywhere;
  text-wrap: balance;
}
.feature-facts {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.when {
  color: var(--paper);
}
.when .line {
  display: block;
  text-wrap: balance;
}
.where {
  text-wrap: balance;
}
/* ghost reads paper on the identity plate, and fills with ink when the split is hovered */
.door {
  color: var(--paper);
  border-color: var(--paper);
}
.feature:hover .door,
.feature:focus-visible .door {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--paper);
}
.feature:hover :deep(.work-img),
.cell:hover :deep(.work-img) {
  border-color: var(--paper);
}

/* the record: the album stagger, natural ratios */
.record {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-5) var(--space-4);
  align-items: start;
}
.cell {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  color: inherit;
}
.cell.wide {
  grid-column: span 7;
}
.cell.narrow {
  grid-column: span 5;
}
.cell.dropped {
  margin-top: var(--space-6);
}
.cell .b-display-2 {
  margin-top: var(--space-2);
}
.cell:hover .b-display-2 {
  color: var(--signal);
}

/* the empty wall */
.empty {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-5) var(--space-4);
  align-items: start;
}
.empty-line {
  grid-column: 1 / span 12;
  max-width: 14ch;
}
.stop {
  color: var(--jacaranda);
}
.empty-words {
  grid-column: 1 / span 6;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.doors {
  grid-column: 8 / span 5;
}
.row-link {
  display: block;
  color: inherit;
}
.row-link:hover {
  color: var(--jacaranda-deep);
}

@media (max-width: 840px) {
  .feature,
  .feature.flipped {
    grid-template-columns: 1fr;
  }
  .feature.flipped .feature-work {
    order: 0;
  }
  .feature-work,
  .feature.flipped .feature-work {
    justify-content: center;
  }
  .feature-plate {
    margin-top: 0;
  }
  .cell.wide,
  .cell.narrow {
    grid-column: span 12;
  }
  .cell.dropped {
    margin-top: 0;
  }
  .empty-words,
  .doors {
    grid-column: 1 / span 12;
  }
}
</style>

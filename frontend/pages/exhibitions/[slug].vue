<script setup lang="ts">
/**
 * One exhibition. It opens on a photograph, whole: the hero image, or with
 * none the first frame on the wall. On now or coming up, it is the event: a
 * jacaranda plate where the dates are the headline and the venue follows,
 * the words a print stacked on it. Closed, it is the record: the facts on
 * ink and the words on paper. Either way the frames follow, uncropped and
 * credited one by one, and the essays they came out of are doors. Nothing
 * invented: a missing date reads TBC.
 */
import type { Essay, Exhibition, Media } from '~/types/payload-types'

const route = useRoute()
const slug = route.params.slug as string

interface List<T> { docs: T[] }

const { data } = await useCmsData<List<Exhibition>>(`exhibition-${slug}`, exhibitionQuery(slug))
const exhibition = computed(() => data.value?.docs?.[0] ?? null)

if (!exhibition.value) {
  throw createError({ statusCode: 404, statusMessage: 'Exhibition not found', fatal: true })
}

// One clock for server and browser, so the phase cannot change under hydration.
const now = useState('exhibitions-now', () => Date.now())
const phase = computed(() => exhibitionPhase(exhibition.value!, now.value))
const past = computed(() => phase.value === 'past')
const dateLines = computed(() => exhibitionDateLines(exhibition.value!))

const hero = computed(() => {
  const h = exhibition.value?.heroImage
  return h && typeof h === 'object' && mediaSrc(h) ? h : null
})
const frames = computed(() => exhibitionFrames(exhibition.value!))
// With no hero image the first frame on the wall opens the page, and the
// rest of the wall follows it; no frame is shown twice.
const opener = computed(() => (hero.value ? null : (frames.value[0] ?? null)))
const wall = computed(() => (opener.value ? frames.value.slice(1) : frames.value))
const photographers = computed(() => exhibitionPhotographers(exhibition.value!))
const essays = computed(() =>
  (exhibition.value?.relatedEssays ?? []).filter(
    (e): e is Essay => Boolean(e) && typeof e === 'object' && Boolean(e.slug),
  ),
)
const about = computed(() => richTextBlocks(exhibition.value?.description as never))

type WallFrame = (typeof frames.value)[number]

const ratio = (m: Media | null | undefined) => (m?.width && m?.height ? m.width / m.height : 1.5)
// The album stagger (wide/narrow alternating); a portrait always takes the
// narrow cell, so it is never taller than the screen it is seen on.
function frameSpan(frame: WallFrame, i: number): 'wide' | 'narrow' {
  if (ratio(frame.image) < 1) return 'narrow'
  return i % 4 === 0 || i % 4 === 3 ? 'wide' : 'narrow'
}
function frameAlt(frame: WallFrame): string {
  return frame.image.alt || frame.caption || ''
}
// A frame opens its larger rendition in its own tab, through ipx: the raw
// /api/media path does not exist on this origin. 1920 is the widest step.
const img = useImage()
function frameFullSrc(frame: WallFrame): string {
  return img(mediaSrc(frame.image)!, { width: 1920, quality: 85 })
}

function essayLead(essay: Essay) {
  const lead = essay.leadFrame
  if (!lead || typeof lead !== 'object') return null
  const media = lead.image && typeof lead.image === 'object' && mediaSrc(lead.image) ? lead.image : null
  return media ? { media, credit: frameCredit(lead) } : null
}

const lead = exhibitionLead(exhibition.value)
const where = exhibition.value.venue ? ` at ${exhibition.value.venue}` : ''
const dates = exhibitionDates(exhibition.value)

useShareMeta({
  title: exhibition.value.title,
  description:
    richTextPlain(exhibition.value.description as never) ||
    `${exhibition.value.title}. A Bathong. exhibition${where}. ${dates}. Every frame credited.`,
  image: `/share/exhibition/${encodeURIComponent(slug)}.jpg?v=${shareVersion(exhibition.value.updatedAt)}`,
  imageAlt: lead?.media.alt ?? `Card for the Bathong. exhibition ${exhibition.value.title}. ${dates}.`,
  // one photographer on the wall: the copyright line names them
  author: photographers.value.length === 1 ? (photographers.value[0]?.name ?? undefined) : undefined,
})
</script>

<template>
  <div v-if="exhibition">
    <section class="chapter head">
      <p class="b-kicker">Exhibition · {{ exhibitionPhaseLabel(phase) }}</p>
      <h1 class="b-display-1">{{ exhibition.title }}</h1>
      <p v-if="photographers.length" class="b-caption byline">
        Photographs ©
        <template v-for="(person, i) in photographers" :key="person.id">
          <template v-if="i > 0">{{ i === photographers.length - 1 ? ' and ' : ', ' }}</template>
          <NuxtLink v-if="person.slug" :to="`/photographers/${person.slug}`">{{ person.name }}</NuxtLink>
          <template v-else>{{ person.name }}</template>
        </template>
      </p>
      <!-- the record: closed, the facts sit on ink -->
      <dl v-if="past" class="facts b-caption">
        <div><dt>Dates</dt><dd>{{ dates }}</dd></div>
        <div><dt>Venue</dt><dd>{{ exhibition.venue ?? 'TBC' }}</dd></div>
        <div v-if="exhibition.partners"><dt>Partners</dt><dd>{{ exhibition.partners }}</dd></div>
      </dl>
    </section>

    <!-- the opening photograph: whole, credited, never taller than the screen -->
    <figure v-if="hero" class="lead" :style="{ '--ratio': ratio(hero) }">
      <NuxtPicture
        :src="mediaSrc(hero)!"
        :alt="hero.alt ?? exhibition.title"
        :width="hero.width ?? undefined"
        :height="hero.height ?? undefined"
        sizes="xs:100vw md:100vw lg:100vw xl:1920px"
        format="avif,webp"
        loading="eager"
        preload
        :img-attrs="{ class: 'run-img' }"
      />
      <FrameCaption standalone :credit="hero.credit?.trim() || 'Bathong. Collective'" />
    </figure>
    <figure v-else-if="opener" class="lead frame" :style="{ '--ratio': ratio(opener.image) }">
      <a
        :href="frameFullSrc(opener)"
        target="_blank"
        rel="noopener"
        class="open"
        :aria-label="frameAlt(opener) ? `Open the frame: ${frameAlt(opener)}` : 'Open the frame'"
      >
        <NuxtPicture
          :src="mediaSrc(opener.image)!"
          :alt="frameAlt(opener)"
          :width="opener.image.width ?? undefined"
          :height="opener.image.height ?? undefined"
          sizes="xs:100vw md:100vw lg:100vw xl:1920px"
          format="avif,webp"
          loading="eager"
          preload
          :img-attrs="{ class: 'run-img' }"
        />
      </a>
      <FrameCaption
        standalone
        :credit="frameCredit(opener)"
        :place="opener.location ?? undefined"
        :time="opener.year ? String(opener.year) : undefined"
      />
      <p v-if="opener.caption" class="b-caption note">{{ opener.caption }}</p>
    </figure>

    <!-- the event: the dates are the headline, the venue under them -->
    <section v-if="!past" class="plate on-jacaranda" aria-label="When and where">
      <p class="state"><BTag :variant="phase === 'current' ? 'signal' : 'ink'">{{ exhibitionPhaseLabel(phase) }}</BTag></p>
      <p class="b-display-1 when">
        <span v-for="(line, n) in dateLines" :key="n" class="line">{{ line }}</span>
      </p>
      <p class="b-display-2 where">{{ exhibition.venue ?? 'Venue TBC' }}</p>
      <!-- the words read as a print stacked on the plate: ink on paper -->
      <div v-if="about.length || exhibition.partners" class="about-card">
        <template v-for="(block, i) in about" :key="i">
          <component
            :is="block.type === 'list' && block.ordered ? 'ol' : 'ul'"
            v-if="block.type === 'list'"
            class="about-list"
          >
            <li v-for="(item, j) in block.items" :key="j">{{ item }}</li>
          </component>
          <p v-else>{{ block.text }}</p>
        </template>
        <p v-if="exhibition.partners" class="b-caption partners">Partners · {{ exhibition.partners }}</p>
      </div>
    </section>
    <section v-else-if="about.length" class="chapter chapter--paper about">
      <template v-for="(block, i) in about" :key="i">
        <component
          :is="block.type === 'list' && block.ordered ? 'ol' : 'ul'"
          v-if="block.type === 'list'"
          class="about-list"
        >
          <li v-for="(item, j) in block.items" :key="j">{{ item }}</li>
        </component>
        <p v-else :class="{ 'b-lede': i === 0 }">{{ block.text }}</p>
      </template>
    </section>

    <section class="share">
      <ShareRow :title="exhibition.title" />
    </section>

    <!-- the wall: every frame whole, in hanging order, its maker under it -->
    <section v-if="wall.length" class="chapter wall">
      <ChapterHead title="The frames" />
      <div class="run">
        <figure
          v-for="(frame, i) in wall"
          :key="frame.id"
          class="cell frame"
          :class="[frameSpan(frame, i), { dropped: i % 2 === 1 }]"
        >
          <a
            :href="frameFullSrc(frame)"
            target="_blank"
            rel="noopener"
            class="open"
            :aria-label="frameAlt(frame) ? `Open the frame: ${frameAlt(frame)}` : 'Open the frame'"
          >
            <NuxtPicture
              :src="mediaSrc(frame.image)!"
              :alt="frameAlt(frame)"
              :width="frame.image.width ?? undefined"
              :height="frame.image.height ?? undefined"
              sizes="xs:100vw md:60vw lg:60vw xl:900px"
              format="avif,webp"
              loading="lazy"
              :img-attrs="{ class: 'run-img' }"
            />
          </a>
          <FrameCaption
            standalone
            :credit="frameCredit(frame)"
            :place="frame.location ?? undefined"
            :time="frame.year ? String(frame.year) : undefined"
          />
          <p v-if="frame.caption" class="b-caption note">{{ frame.caption }}</p>
        </figure>
      </div>
    </section>
    <section v-else-if="!frames.length" class="chapter">
      <p class="b-lede">The frames for this exhibition are not published yet.</p>
    </section>

    <!-- where the frames come from: each essay a door, its lead frame as shot -->
    <section v-if="essays.length" v-reveal class="chapter">
      <ChapterHead title="The essays" />
      <div class="essays">
        <NuxtLink v-for="essay in essays" :key="essay.id" :to="`/stories/${essay.slug}`" class="essay">
          <figure v-if="essayLead(essay)" class="essay-lead">
            <NuxtPicture
              :src="mediaSrc(essayLead(essay)!.media)!"
              :alt="essayLead(essay)!.media.alt ?? essay.title"
              :width="essayLead(essay)!.media.width ?? undefined"
              :height="essayLead(essay)!.media.height ?? undefined"
              sizes="xs:100vw md:60vw lg:60vw xl:900px"
              format="avif,webp"
              loading="lazy"
              :img-attrs="{ class: 'run-img' }"
            />
            <FrameCaption standalone :credit="essayLead(essay)!.credit" />
          </figure>
          <div class="essay-words">
            <h3 class="b-display-2">{{ essay.title }}</h3>
            <p v-if="essay.deck" class="deck">{{ essay.deck }}</p>
            <span class="b-kicker door">Read the essay →</span>
          </div>
        </NuxtLink>
      </div>
    </section>

    <p class="b-kicker back"><NuxtLink to="/exhibitions">All exhibitions →</NuxtLink></p>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-bottom: var(--space-5);
}
.head .b-kicker {
  color: var(--grey-ghost);
}
.head h1 {
  max-width: 18ch;
  overflow-wrap: anywhere;
  text-wrap: balance;
}
.byline {
  color: var(--grey-ghost);
}
.byline a {
  color: var(--paper);
}
.byline a:hover {
  color: var(--signal);
}
.facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, max-content));
  gap: var(--space-3) var(--space-5);
  margin: var(--space-3) 0;
  padding: var(--space-3) 0;
  border-top: 1px solid var(--grey-line);
  border-bottom: 1px solid var(--grey-line);
}
.facts dt {
  color: var(--grey-ghost);
}
.facts dd {
  margin: 4px 0 0;
  color: var(--paper);
}

/* seen whole or not at all: the width follows the file's ratio, capped by the screen's height */
.lead {
  margin: 0 var(--space-4) var(--space-5);
  width: min(calc(100% - 2 * var(--space-4)), calc(82vh * var(--ratio)));
}
.lead :deep(picture),
.run :deep(picture),
.essay-lead :deep(picture) {
  display: block;
}
/* the 2px ink frame is invisible on ink; hairline instead, and no crop */
.lead :deep(.run-img),
.run :deep(.run-img),
.essay-lead :deep(.run-img) {
  display: block;
  width: 100%;
  height: auto;
  border: 1px solid var(--grey-line);
  border-bottom: 0;
}

/* the plate: jacaranda carries the dates and the venue, paper carries the
   words. The dates run the full width; the venue and the print share the
   row under them. */
.plate {
  padding: var(--space-6) var(--space-4);
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: var(--space-3) var(--space-4);
  align-items: start;
}
.state,
.when {
  grid-column: 1 / -1;
}
.when {
  color: var(--paper);
}
.when .line {
  display: block;
  text-wrap: balance;
}
.where {
  grid-column: 1 / span 5;
  text-wrap: balance;
}
.about-card {
  grid-column: 7 / span 6;
  background: var(--paper);
  color: var(--ink);
  border: var(--border-frame);
  box-shadow: var(--shadow-print);
  padding: var(--space-4);
  max-width: 62ch;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  /* keep the 10px offset shadow inside the plate */
  margin: var(--space-2) 10px 10px 0;
}
.about-card .partners {
  color: var(--grey-ink);
}
.about {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.about p {
  max-width: 62ch;
}
.about-list {
  margin: 0;
  padding-left: 1.2em;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.share {
  padding: var(--space-4) var(--space-4) 0;
  color: var(--grey-ghost);
}
.wall {
  padding-top: var(--space-5);
}

/* the run: the album stagger, natural ratios - never crop to fill */
.run {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-5) var(--space-4);
  align-items: start;
}
.cell {
  margin: 0;
  display: flex;
  flex-direction: column;
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
.open {
  display: block;
  cursor: zoom-in;
}
.open:hover :deep(.run-img),
.open:focus-visible :deep(.run-img),
.essay:hover :deep(.run-img) {
  border-color: var(--paper);
}
.note {
  margin-top: var(--space-2);
  color: var(--grey-ghost);
}

/* the essays: the lead frame as shot, the words beside it, sides alternating */
.essays {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}
.essay {
  display: flex;
  align-items: flex-end;
  gap: var(--space-4);
  color: inherit;
}
.essay:nth-child(even) {
  flex-direction: row-reverse;
}
.essay-lead {
  flex: 7;
  min-width: 0;
  margin: 0;
}
.essay-words {
  flex: 5;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.essay:hover .b-display-2 {
  color: var(--signal);
}
.deck {
  color: var(--grey-fog);
  max-width: 48ch;
}
.door {
  margin-top: var(--space-2);
  color: var(--signal);
}
.back {
  padding: 0 var(--space-4) var(--space-5);
}
.back a {
  color: var(--grey-ghost);
}
.back a:hover {
  color: var(--signal);
}
@media (max-width: 840px) {
  .where,
  .about-card {
    grid-column: 1 / -1;
  }
  .about-card {
    margin-top: var(--space-4);
  }
  .cell.wide,
  .cell.narrow {
    grid-column: span 12;
  }
  .cell.dropped {
    margin-top: 0;
  }
  .essays {
    gap: var(--space-5);
  }
  .essay,
  .essay:nth-child(even) {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-3);
  }
}
</style>

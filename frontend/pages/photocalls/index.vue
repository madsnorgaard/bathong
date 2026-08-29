<script setup lang="ts">
/**
 * The photocall (W6): status, deadline and brief in the one signal plate the
 * site carries; the three lines that remove the excuse; the form on the same
 * screen; what happens next as a public promise.
 */
import type { Photocall } from '~/types/payload-types'

interface List<T> { docs: T[] }

const { data } = await useCmsData<List<Photocall>>(
  'photocall-open',
  '/api/photocalls?where[status][equals]=open&sort=-opensAt&limit=1&depth=0',
)
const call = computed(() => data.value?.docs?.[0] ?? null)
const brief = computed(() => richTextParagraphs(call.value?.theme as never))
const terms = computed(() => richTextParagraphs(call.value?.terms as never))
const closesLine = computed(() => {
  if (!call.value?.closesAt) return 'closing date TBC'
  return `closes ${formatWalkDate(call.value.closesAt)}`
})

// og:image is the generated C5 signal card only while a call is open - the
// spec retires the card the day the call closes.
useShareMeta({
  title: 'Photocalls',
  description:
    'Open calls from the Bathong. collective. Anyone can enter, it costs nothing, you keep everything.',
  image: call.value
    ? `/share/photocalls.jpg?v=${call.value.updatedAt ? new Date(call.value.updatedAt).getTime() : 0}`
    : undefined,
  imageAlt: call.value
    ? `Open photocall announcement: ${call.value.title}, ${closesLine.value}.`
    : undefined,
})
</script>

<template>
  <div>
    <template v-if="call">
      <!-- the loudest plate we make, used once -->
      <section class="chapter chapter--signal">
        <p class="b-kicker">Photocall · open · {{ closesLine }}</p>
        <h1 class="b-display-1">{{ call.title }}</h1>
        <p v-if="call.maxImagesPerSubmission" class="b-caption">
          Up to {{ call.maxImagesPerSubmission }} frames
        </p>
      </section>

      <div class="body">
        <!-- the brief, and the three lines that remove the excuse -->
        <section class="chapter brief">
          <ChapterHead title="The brief" />
          <p v-for="(para, i) in brief" :key="i" class="b-lede">{{ para }}</p>
          <dl class="lines b-caption">
            <div><dt>Who can enter</dt><dd>{{ call.membersOnly ? 'members of the collective' : 'anyone, member or not' }}</dd></div>
            <div><dt>What it costs</dt><dd>nothing</dd></div>
            <div><dt>What you keep</dt><dd>everything</dd></div>
          </dl>
          <ShareRow :title="call.title" label="Pass it on" class="share" />
        </section>

        <!-- the form is on the same screen as the brief -->
        <section id="enter" class="chapter">
          <ChapterHead title="Enter" />
          <SubmitForm
            :photocall-id="call.id"
            :max-frames="call.maxImagesPerSubmission ?? 5"
            :terms-paragraphs="terms"
          />
        </section>
      </div>

      <!-- say what happens after, in public, as a promise -->
      <section class="chapter chapter--paper">
        <ChapterHead title="What happens next" />
        <p class="b-lede promise">
          Every entrant gets a written response, frame by frame. Selected work is published as an
          essay and shown at the first exhibition, with your name on it.
        </p>
      </section>
    </template>

    <section v-else class="chapter">
      <ChapterHead title="Photocalls" />
      <p class="b-lede">
        No call is open right now. Photocall 001 opens after Walk № 001, and it lands here first.
        Anyone can enter, it costs nothing, you keep everything.
      </p>
    </section>
  </div>
</template>

<style scoped>
.share {
  margin-top: var(--space-4);
  color: var(--grey-ghost);
}
.brief {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.brief .b-lede {
  max-width: 62ch;
}
.lines {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-3);
  border-top: 1px solid var(--grey-line);
  padding-top: var(--space-3);
  max-width: 44rem;
}
.lines div {
  display: grid;
  grid-template-columns: 12rem 1fr;
  gap: var(--space-3);
}
.lines dt {
  color: var(--grey-ghost);
}
.promise {
  max-width: 62ch;
}
@media (max-width: 840px) {
  .lines div {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}
</style>

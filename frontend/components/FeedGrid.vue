<script setup lang="ts">
/**
 * The feed: recent single frames on the darkroom ground. Staggered,
 * asymmetric rows (wide/narrow alternating, the narrow frame dropped),
 * never cropped to fill: every frame keeps 3/2. Hairline-framed on ink.
 */
interface FrameDoc {
  id: string | number
  image?: { url?: string | null; alt?: string | null } | string | null
  photographer?: { name?: string | null } | string | null
  creditOverride?: string | null
  caption?: string | null
  location?: string | null
}

defineProps<{ frames: FrameDoc[] }>()
</script>

<template>
  <div class="feed">
    <div
      v-for="(frame, i) in frames.slice(0, 6)"
      :key="frame.id"
      class="cell"
      :class="[i % 4 === 0 || i % 4 === 3 ? 'wide' : 'narrow', { dropped: i % 2 === 1 }]"
    >
      <BFrame
        :src="mediaSrc(frame.image as never)"
        :alt="typeof frame.image === 'object' && frame.image?.alt ? frame.image.alt : (frame.caption ?? '')"
        :credit="frameCredit(frame)"
        :place="frame.location ?? undefined"
        sizes="xs:100vw md:60vw lg:60vw xl:60vw"
        class="feed-frame"
      />
    </div>
  </div>
</template>

<style scoped>
.feed {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-5) var(--space-4);
  align-items: start;
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
/* the 2px ink frame is invisible on ink; the system drops to a hairline */
.feed-frame {
  border: 1px solid var(--grey-line);
}
@media (max-width: 840px) {
  .cell.wide,
  .cell.narrow {
    grid-column: span 12;
  }
  .cell.dropped {
    margin-top: 0;
  }
}
</style>

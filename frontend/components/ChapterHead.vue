<script setup lang="ts">
/**
 * A chapter head: display type ending in the brand's own punctuation, the
 * jacaranda full stop. The mark states; no archive index, no eyebrow.
 */
defineProps<{ title: string }>()
</script>

<template>
  <h2 class="b-display-1 chapter-head">{{ title }}<span class="stop">.</span></h2>
</template>

<style scoped>
.chapter-head {
  margin-bottom: var(--space-5);
}
.stop {
  color: var(--jacaranda);
}
</style>

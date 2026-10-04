<script setup lang="ts">
/**
 * A chapter head: display type ending in the brand's own punctuation, the
 * jacaranda full stop. The mark states; no archive index, no eyebrow.
 * A chapter is an h2; where the head names the page itself (an index with no
 * other title) it is the h1, and looks the same.
 */
withDefaults(defineProps<{ title: string; level?: 1 | 2 }>(), { level: 2 })
</script>

<template>
  <component :is="`h${level}`" class="b-display-1 chapter-head">{{ title }}<span class="stop">.</span></component>
</template>

<style scoped>
.chapter-head {
  margin-bottom: var(--space-5);
}
.stop {
  color: var(--jacaranda);
}
</style>

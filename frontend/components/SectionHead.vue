<script setup lang="ts">
/** Section head with the archive index: "02 / The work comes first". */
defineProps<{ index: number; title: string }>()
</script>

<template>
  <div class="b-sechead">
    <h2 class="b-display-1">{{ title }}</h2>
    <span class="idx">{{ sectionIndex(index) }}</span>
    <slot />
  </div>
</template>

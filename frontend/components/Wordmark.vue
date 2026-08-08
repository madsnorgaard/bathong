<script setup lang="ts">
/** The mark. Live type, never an image. "Bathong." with the jacaranda stop. */
withDefaults(defineProps<{ hero?: boolean; to?: string }>(), { hero: false, to: '/' })
</script>

<template>
  <NuxtLink :to="to" class="b-mark" :class="{ 'b-mark--hero': hero }" aria-label="Bathong. home">
    Bathong<span class="dot">.</span>
  </NuxtLink>
</template>

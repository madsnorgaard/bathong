<script setup lang="ts">
/**
 * The 26s ticker. Items are live content (next walk, open photocall, latest
 * essay), separated by the signal dot. Track is duplicated for the seamless
 * -50% loop; reduced motion stops it via components.css.
 */
const props = defineProps<{ items: string[] }>()
const line = computed(() => props.items.filter(Boolean))
</script>

<template>
  <div v-if="line.length" class="b-ticker" aria-hidden="true">
    <div class="track">
      <template v-for="n in 2" :key="n">
        <template v-for="(item, i) in line" :key="`${n}-${i}`">
          {{ item }} <b>●</b>{{ ' ' }}
        </template>
      </template>
    </div>
  </div>
</template>

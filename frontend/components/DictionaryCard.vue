<script setup lang="ts">
/** The definition. The strongest brand object; lives on About in v2. */
withDefaults(
  defineProps<{
    headword?: string
    pos?: string
    senses?: string[]
    paper?: boolean
  }>(),
  {
    headword: 'ba·thong',
    pos: 'excl. / loc.',
    senses: () => [
      "what you say when you can't believe what you're seeing.",
      'among the people - where this work is made.',
    ],
    paper: false,
  },
)
</script>

<template>
  <div class="b-dict" :class="{ 'b-dict--paper': paper }">
    <div class="entry">{{ headword }}</div>
    <p><span class="pos">{{ pos }}</span> - Sepedi / Setswana, from <em>batho</em>: people.</p>
    <ol class="senses">
      <li v-for="(sense, i) in senses" :key="i">{{ i + 1 }}. {{ sense }}</li>
    </ol>
  </div>
</template>

<style scoped>
.senses {
  list-style: none;
  margin-top: 8px;
}
</style>

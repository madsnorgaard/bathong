<script setup lang="ts">
/**
 * Footer on ink: wordmark, contact, social links as mono text (no icon set
 * by design), the NPC line. Data from the site-settings global.
 */
interface SiteSettings {
  contactEmail?: string | null
  instagram?: string | null
  facebook?: string | null
  linkedin?: string | null
}

const { data: settings } = await useCmsData<SiteSettings>('site-settings', '/api/globals/site-settings')

const socials = computed(() => {
  const s = settings.value
  if (!s) return []
  return [
    s.instagram && { label: 'Instagram', href: s.instagram },
    s.facebook && { label: 'Facebook', href: s.facebook },
    s.linkedin && { label: 'LinkedIn', href: s.linkedin },
  ].filter(Boolean) as { label: string; href: string }[]
})

const email = computed(() => settings.value?.contactEmail || null)
const year = new Date().getFullYear()
</script>

<template>
  <footer class="footer on-ink">
    <div class="footer-inner">
      <Wordmark />
      <div class="cols">
        <div class="col">
          <p class="b-caption">Contact</p>
          <a v-if="email" :href="`mailto:${email}`" class="b-kicker">{{ email }}</a>
          <p v-else class="b-kicker">hello@ · TBC</p>
        </div>
        <div v-if="socials.length" class="col">
          <p class="b-caption">Elsewhere</p>
          <a v-for="s in socials" :key="s.label" :href="s.href" class="b-kicker" rel="noopener">
            {{ s.label }} →
          </a>
        </div>
        <div class="col">
          <p class="b-caption">The collective</p>
          <p class="npc b-kicker">Bathong. Collective NPC · Pretoria</p>
          <NuxtLink to="/privacy" class="b-kicker">Privacy →</NuxtLink>
        </div>
      </div>
      <p class="legal b-caption">© {{ year }} Bathong. Collective. Photographers keep their copyright. Always.</p>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  border-top: var(--border-frame);
  margin-top: var(--space-6);
}
.footer-inner {
  padding: var(--space-6) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.footer-inner :deep(.b-mark) {
  font-size: 2.2rem;
  color: var(--paper); /* the mark is paper on ink; .on-ink a would turn it signal */
}
.footer-inner :deep(.b-mark:hover) {
  color: var(--paper);
}
.cols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
}
.col {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.col a {
  color: var(--paper);
}
.col a:hover {
  color: var(--signal);
}
.legal {
  border-top: var(--hairline);
  padding-top: var(--space-3);
}
</style>

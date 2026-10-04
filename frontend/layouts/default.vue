<template>
  <div class="site on-ink grain">
    <SiteNav />
    <!-- the skip link's target: reachable by its href without JavaScript -->
    <main id="main" tabindex="-1">
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>

<style scoped>
/* The darkroom is the site: ink is the page ground, paper and jacaranda
   appear as deliberate full-bleed chapters. */
.site {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--surface-dark);
  color: var(--text-on-dark);
}
main {
  flex: 1;
}
</style>

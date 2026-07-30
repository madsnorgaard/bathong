<template>
  <main class="darkroom on-ink grain">
    <p class="b-kicker"><b>notice</b>&nbsp; the full site is in the darkroom</p>
    <h1 class="b-mark b-mark--hero">Bathong<span class="dot">.</span></h1>
    <p class="b-caption darkroom-caption">
      street photography collective / pretoria, za
    </p>
  </main>
</template>

<style scoped>
.darkroom {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: var(--space-4);
}
.darkroom .b-kicker {
  margin-bottom: var(--space-4);
}
.darkroom-caption {
  margin-top: var(--space-3);
  letter-spacing: var(--track-label);
}
</style>

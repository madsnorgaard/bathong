<script setup lang="ts">
/**
 * The desk's own nav: mono kickers, 44px targets. Join shows on every
 * account page until the membership is active, and never after.
 */
import { effectiveStatus } from '~/utils/membership'

const { user } = useAuth()
const showJoin = computed(() => effectiveStatus(user.value) !== 'active')
</script>

<template>
  <nav class="account-nav b-kicker" aria-label="Account">
    <NuxtLink to="/account">Desk</NuxtLink>
    <NuxtLink to="/account/profile">Profile</NuxtLink>
    <NuxtLink to="/account/security">Security</NuxtLink>
    <NuxtLink v-if="showJoin" to="/account/join">Join</NuxtLink>
  </nav>
</template>

<style scoped>
.account-nav {
  display: flex;
  gap: var(--space-4);
  border-bottom: 1px solid var(--grey-line);
}
.account-nav a {
  color: var(--grey-ghost);
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}
.account-nav a:hover,
.account-nav a.router-link-exact-active {
  color: var(--signal);
}
</style>

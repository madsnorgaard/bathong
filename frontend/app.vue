<script setup lang="ts">
// The session is read once per request (SSR, cookie forwarded) and reused
// on the client, so the nav renders Sign in / Account without a flash.
const { fetchMe } = useAuth()
await callOnce('auth-me', () => fetchMe())
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

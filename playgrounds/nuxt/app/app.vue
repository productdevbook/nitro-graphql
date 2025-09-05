<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">

useHead({
  title: 'Nuxt + nitro-graphql Example',
  meta: [
    { name: 'description', content: 'Testing nitro-graphql module with Nuxt.js' }
  ]
})

</script>

<style>
body {
  font-family: system-ui, -apple-system, sans-serif;
}
</style>

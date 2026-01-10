<script setup lang="ts">
const { data } = await useFetch('/api/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: { query: '{ hello }' },
})
</script>

<template>
  <div>
    <h1>Nuxt + nitro-graphql</h1>
    <p>GraphQL Response: {{ data?.data?.hello }}</p>
    <p>
      <a href="/api/graphql" target="_blank">Open GraphQL Playground</a>
    </p>
  </div>
</template>

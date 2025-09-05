<template>
  <div>
    <h1>Countries Test</h1>
    <button @click="fetchCountries">Fetch Countries</button>
    <pre>{{ countries }}</pre>
  </div>
</template>

<script setup lang="ts">
import type { 
  GetCountriesQuery  
} from '#graphql/client/countries'

const countries = ref<GetCountriesQuery | null>(null)

async function fetchCountries() {
  try {
    const result = await $countriesSdk.GetCountries()
    countries.value = result.data ?? null
  } catch (error) {
    console.error('Error fetching countries:', error)
  }
}
</script>
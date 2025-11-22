<script setup lang="ts">
import HelloWorld from '../components/HelloWorld.vue'
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-950">
    <div class="text-center space-y-12 p-8">
      <!-- Logos -->
      <div class="flex items-center justify-center gap-8 flex-wrap">
        <a
          href="https://vite.dev"
          target="_blank"
          class="block transition-transform hover:-translate-y-2 duration-300"
        >
          <img
            src="/vite.svg"
            width="128"
            height="128"
            class="h-32 hover:drop-shadow-[0_0_3rem_#646cffaa]"
            alt="Vite logo"
          />
        </a>
        <a
          href="https://vuejs.org/"
          target="_blank"
          class="block transition-transform hover:-translate-y-2 duration-300"
        >
          <img
            src="../assets/vue.svg"
            width="128"
            height="128"
            class="h-32 hover:drop-shadow-[0_0_3rem_#42b883aa]"
            alt="Vue logo"
          />
        </a>
        <a
          href="https://nitro.unjs.io"
          target="_blank"
          class="block transition-transform hover:-translate-y-2 duration-300"
        >
          <img
            src="https://v3.nitro.build/icon.svg"
            width="128"
            height="128"
            class="h-32 hover:drop-shadow-[0_0_3rem_#00dc82aa]"
            alt="Nitro logo"
          />
        </a>
        <a
          href="https://github.com/productdevbook/nitro-graphql"
          target="_blank"
          class="block transition-transform hover:-translate-y-2 duration-300"
        >
          <img
            src="https://github.com/productdevbook/nitro-graphql/raw/main/.docs/public/logo.svg"
            width="128"
            height="128"
            class="h-32 hover:drop-shadow-[0_0_3rem_#e535abaa]"
            alt="Nitro GraphQL logo"
          />
        </a>
      </div>

      <!-- Content -->
      <HelloWorld msg="Vite + Vue + Nitro + GraphQL" />

      <!-- Navigation -->
      <div class="flex gap-4 justify-center flex-wrap">
        <router-link
          to="/about"
          class="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          About
        </router-link>
        <router-link
          to="/contact"
          class="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          Contact
        </router-link>
        <router-link
          to="/pinia-colada-demo"
          class="px-6 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition-colors"
        >
          Pinia Colada Demo
        </router-link>
      </div>
    </div>
  </div>
</template>

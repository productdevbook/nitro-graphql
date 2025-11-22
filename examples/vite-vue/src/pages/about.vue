<script setup lang="ts">
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-950">
    <div class="max-w-2xl mx-auto p-8 text-center space-y-8">
      <h1 class="text-5xl font-bold text-white">About</h1>

      <p class="text-gray-300 text-lg leading-relaxed">
        A modern full-stack Vue 3 + Vite + Nitro + GraphQL project.
        Built with cutting-edge technologies and Tailwind CSS v4.
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
        <div class="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
          <h3 class="text-emerald-400 font-semibold mb-3 text-lg">Frontend</h3>
          <ul class="text-gray-300 text-sm space-y-2">
            <li>• <strong>Vue 3</strong> - Progressive JavaScript framework</li>
            <li>• <strong>Vite</strong> - Next generation frontend tooling</li>
            <li>• <strong>Vue Router</strong> - Official router for Vue.js</li>
            <li>• <strong>Tailwind CSS v4</strong> - Utility-first CSS framework</li>
          </ul>
        </div>

        <div class="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
          <h3 class="text-blue-400 font-semibold mb-3 text-lg">Backend</h3>
          <ul class="text-gray-300 text-sm space-y-2">
            <li>• <strong>Nitro</strong> - Universal server framework</li>
            <li>• <strong>nitro-graphql</strong> - GraphQL for Nitro</li>
            <li>• <strong>GraphQL Yoga</strong> - Fully-featured GraphQL server</li>
            <li>• <strong>Type-safe SDK</strong> - Auto-generated client SDK</li>
          </ul>
        </div>
      </div>

      <div class="p-6 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-lg border border-purple-700/50">
        <h3 class="text-pink-400 font-semibold mb-3 text-lg">🚀 Features</h3>
        <div class="text-gray-300 text-sm space-y-2 text-left">
          <p>• <strong>Nitro:</strong> Next-gen server engine, build and deploy anywhere (Vercel, Netlify, Cloudflare, etc.)</p>
          <p>• <strong>nitro-graphql:</strong> File-based GraphQL schema, auto-generated resolvers, type-safe client SDK</p>
          <p>• <strong>HMR:</strong> Lightning-fast hot module replacement for instant feedback</p>
          <p>• <strong>SSR Ready:</strong> Server-side rendering support with Nitro</p>
        </div>
      </div>

      <router-link
        to="/"
        class="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
      >
        ← Back to Home
      </router-link>
    </div>
  </div>
</template>

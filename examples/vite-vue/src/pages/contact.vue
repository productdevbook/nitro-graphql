<script setup lang="ts">
import { ref } from 'vue'

const form = ref({
  name: '',
  email: '',
  message: ''
})

const handleSubmit = () => {
  console.log('Form submitted:', form.value)
  alert('Form submitted! (Check console)')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-950 py-12">
    <div class="max-w-md w-full mx-auto p-8 space-y-8">
      <div class="text-center">
        <h1 class="text-5xl font-bold text-white mb-2">Contact</h1>
        <p class="text-gray-400">Get in touch with us</p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label for="name" class="block text-sm font-medium text-gray-300 mb-2">
            Name
          </label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            required
            class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label for="email" class="block text-sm font-medium text-gray-300 mb-2">
            Email
          </label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            required
            class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="john@example.com"
          />
        </div>

        <div>
          <label for="message" class="block text-sm font-medium text-gray-300 mb-2">
            Message
          </label>
          <textarea
            id="message"
            v-model="form.message"
            required
            rows="4"
            class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Your message..."
          ></textarea>
        </div>

        <button
          type="submit"
          class="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
        >
          Send Message
        </button>
      </form>

      <router-link
        to="/"
        class="block text-center text-gray-400 hover:text-white transition-colors"
      >
        ← Back to Home
      </router-link>
    </div>
  </div>
</template>

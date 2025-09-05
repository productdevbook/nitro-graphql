<template>
  <div class="p-8">
    <h1 class="text-3xl font-bold mb-6">Posts from Layer</h1>
    
    <div v-if="pending" class="text-center">
      Loading posts...
    </div>
    
    <div v-else-if="error" class="text-red-500">
      Error loading posts: {{ error }}
    </div>
    
    <div v-else class="space-y-4">
      <div 
        v-for="post in data?.posts" 
        :key="post.id"
        class="border border-gray-200 rounded-lg p-4"
      >
        <h2 class="text-xl font-semibold mb-2">{{ post.title }}</h2>
        <p class="text-gray-600 mb-2">{{ post.content }}</p>
        <div class="text-sm text-gray-500">
          By {{ post.author }} • {{ formatDate(post.createdAt) }}
        </div>
      </div>
      
      <div class="mt-8 p-4 bg-green-100 rounded-lg">
        <h3 class="font-semibold text-green-800">✅ Layer Support Working!</h3>
        <p class="text-green-700">
          These posts are defined in a Nuxt layer at <code>layers/example-layer/</code>.
          The GraphQL schema and resolvers are automatically discovered and merged with the main application.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GetPostsQuery } from '#graphql/client'

const query = gql`
  query GetPosts {
    posts {
      id
      title
      content
      author
      createdAt
    }
  }
`

const { data, pending, error } = await useFetch<{ data: GetPostsQuery }>('/api/graphql', {
  method: 'POST',
  body: {
    query: query,
  },
  transform: (result: any) => result.data
})

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString()
}
</script>
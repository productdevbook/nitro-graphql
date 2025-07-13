<template>
  <div class="container mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Nuxt + nitro-graphql Test</h1>
    
    <div class="space-y-6">
      <!-- GraphQL Queries -->
      <div class="bg-gray-100 p-4 rounded">
        <h2 class="text-xl font-semibold mb-4">GraphQL Queries</h2>
        
        <div class="space-y-4">
          <div>
            <button @click="testHello" class="bg-blue-500 text-white px-4 py-2 rounded">
              Test Hello Query
            </button>
            <p v-if="helloResult" class="mt-2">Result: {{ helloResult }}</p>
          </div>
          
          <div>
            <button @click="testGreeting" class="bg-green-500 text-white px-4 py-2 rounded">
              Test Greeting Query
            </button>
            <p v-if="greetingResult" class="mt-2">Result: {{ greetingResult }}</p>
          </div>
          
          <div>
            <button @click="fetchUsers" class="bg-purple-500 text-white px-4 py-2 rounded">
              Fetch Users
            </button>
            <div v-if="users.length" class="mt-2">
              <h3 class="font-semibold">Users:</h3>
              <ul class="list-disc list-inside">
                <li v-for="user in users" :key="user.id">
                  {{ user.name }} ({{ user.email }})
                </li>
              </ul>
            </div>
          </div>

          <div>
            <button @click="fetchTodos" class="bg-indigo-500 text-white px-4 py-2 rounded">
              Fetch Todos
            </button>
            <div v-if="todos.length" class="mt-2">
              <h3 class="font-semibold">Todos:</h3>
              <ul class="list-disc list-inside">
                <li v-for="todo in todos" :key="todo.id" :class="{ 'line-through': todo.completed }">
                  {{ todo.title }} - {{ todo.completed ? 'Completed' : 'Pending' }}
                </li>
              </ul>
            </div>
          </div>

          <div>
            <button @click="fetchPosts" class="bg-cyan-500 text-white px-4 py-2 rounded">
              Fetch Posts
            </button>
            <div v-if="posts.length" class="mt-2">
              <h3 class="font-semibold">Posts:</h3>
              <ul class="list-disc list-inside">
                <li v-for="post in posts" :key="post.id">
                  <strong>{{ post.title }}</strong> - {{ post.content }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- GraphQL Mutations -->
      <div class="bg-blue-100 p-4 rounded">
        <h2 class="text-xl font-semibold mb-4">GraphQL Mutations</h2>
        
        <div class="space-y-4">
          <!-- Create User -->
          <div class="border-b pb-4">
            <h3 class="font-semibold mb-2">Create User</h3>
            <div class="flex gap-2">
              <input 
                v-model="newUser.name" 
                placeholder="Name" 
                class="border p-2 rounded"
              >
              <input 
                v-model="newUser.email" 
                placeholder="Email" 
                class="border p-2 rounded"
              >
              <button @click="createUser" class="bg-red-500 text-white px-4 py-2 rounded">
                Create User
              </button>
            </div>
          </div>

          <!-- Add Todo -->
          <div class="border-b pb-4">
            <h3 class="font-semibold mb-2">Add Todo</h3>
            <div class="flex gap-2">
              <input 
                v-model="newTodo.title" 
                placeholder="Todo title" 
                class="border p-2 rounded"
              >
              <button @click="addTodo" class="bg-green-500 text-white px-4 py-2 rounded">
                Add Todo
              </button>
            </div>
          </div>

          <!-- Create Post -->
          <div class="border-b pb-4">
            <h3 class="font-semibold mb-2">Create Post</h3>
            <div class="flex gap-2">
              <input 
                v-model="newPost.title" 
                placeholder="Post title" 
                class="border p-2 rounded"
              >
              <input 
                v-model="newPost.content" 
                placeholder="Post content" 
                class="border p-2 rounded"
              >
              <input 
                v-model="newPost.authorId" 
                placeholder="Author ID" 
                class="border p-2 rounded"
              >
              <button @click="createPost" class="bg-orange-500 text-white px-4 py-2 rounded">
                Create Post
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Links -->
      <div class="bg-yellow-100 p-4 rounded">
        <h2 class="text-xl font-semibold mb-4">GraphQL Endpoints</h2>
        <ul class="space-y-2">
          <li>
            <a href="/api/graphql" target="_blank" class="text-blue-600 underline">
              GraphQL Playground (/api/graphql)
            </a>
          </li>
          <li>
            <a href="/api/graphql/health" target="_blank" class="text-blue-600 underline">
              Health Check (/api/graphql/health)
            </a>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GetUsersQuery, GetTodosQuery, GetPostsQuery } from '#graphql/client'

// API instance
const api = useGraphQL()

// Reactive state
const helloResult = ref<string>('')
const greetingResult = ref<string>('')
const users = ref<GetUsersQuery['users']>([])
const todos = ref<GetTodosQuery['todos']>([])
const posts = ref<GetPostsQuery['posts']>([])

// Form data
const newUser = ref({ name: '', email: '' })
const newTodo = ref({ title: '' })
const newPost = ref({ title: '', content: '', authorId: '' })

// Query functions
const testHello = async () => {
  try {
    const response = await api.GetUsers()
    helloResult.value = `Found ${response.users.length} users`
  } catch (error) {
    console.error('Hello query failed:', error)
    helloResult.value = 'Error occurred'
  }
}

const testGreeting = async () => {
  try {
    // This would need a greeting query in your GraphQL schema
    // For now, let's just show a message
    greetingResult.value = 'Hello from Nuxt User!'
  } catch (error) {
    console.error('Greeting query failed:', error)
    greetingResult.value = 'Error: ' + (error as Error).message
  }
}

const fetchUsers = async () => {
  try {
    const response = await api.GetUsers()
    users.value = response.users
  } catch (error) {
    console.error('Users query failed:', error)
  }
}

const fetchTodos = async () => {
  try {
    const response = await api.GetTodos()
    todos.value = response.todos
  } catch (error) {
    console.error('Todos query failed:', error)
  }
}

const fetchPosts = async () => {
  try {
    const response = await api.GetPosts()
    posts.value = response.posts
  } catch (error) {
    console.error('Posts query failed:', error)
  }
}

// Mutation functions
const createUser = async () => {
  if (!newUser.value.name || !newUser.value.email) {
    alert('Please fill in both name and email')
    return
  }

  try {
    const response = await api.CreateUser({
      input: {
        name: newUser.value.name,
        email: newUser.value.email
      }
    })
    
    console.log('User created:', response.createUser)
    newUser.value = { name: '', email: '' }
    await fetchUsers() // Refresh users list
  } catch (error) {
    console.error('Create user failed:', error)
    alert('Failed to create user: ' + (error as Error).message)
  }
}

const addTodo = async () => {
  if (!newTodo.value.title) {
    alert('Please enter a todo title')
    return
  }

  try {
    const response = await api.AddTodo({
      title: newTodo.value.title
    })
    
    console.log('Todo added:', response.addTodo)
    newTodo.value = { title: '' }
    await fetchTodos() // Refresh todos list
  } catch (error) {
    console.error('Add todo failed:', error)
    alert('Failed to add todo: ' + (error as Error).message)
  }
}

const createPost = async () => {
  if (!newPost.value.title || !newPost.value.content || !newPost.value.authorId) {
    alert('Please fill in all fields')
    return
  }

  try {
    const response = await api.CreatePost({
      input: {
        title: newPost.value.title,
        content: newPost.value.content,
        authorId: newPost.value.authorId
      }
    })
    
    console.log('Post created:', response.createPost)
    newPost.value = { title: '', content: '', authorId: '' }
    await fetchPosts() // Refresh posts list
  } catch (error) {
    console.error('Create post failed:', error)
    alert('Failed to create post: ' + (error as Error).message)
  }
}

// Load initial data
onMounted(async () => {
  await Promise.all([
    fetchUsers(),
    fetchTodos(),
    fetchPosts()
  ])
})
</script>
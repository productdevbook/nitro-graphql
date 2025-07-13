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
        </div>
      </div>

      <!-- GraphQL Mutations -->
      <div class="bg-blue-100 p-4 rounded">
        <h2 class="text-xl font-semibold mb-4">GraphQL Mutations</h2>
        
        <div class="space-y-4">
          <div>
            <input 
              v-model="newUser.name" 
              placeholder="Name" 
              class="border p-2 rounded mr-2"
            >
            <input 
              v-model="newUser.email" 
              placeholder="Email" 
              class="border p-2 rounded mr-2"
            >
            <button @click="createUser" class="bg-red-500 text-white px-4 py-2 rounded">
              Create User
            </button>
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
const helloResult = ref()
const greetingResult = ref('')
const users = ref([])
const newUser = ref({ name: '', email: '' })
const api = useGraphQL()

const testHello = async () => {
  try {
    const response = await api.GetUsers()
    helloResult.value = response.users
  } catch (error) {
    console.error('Hello query failed:', error)
  }
}

const testGreeting = async () => {
  try {
    const response = await $fetch('/api/graphql', {
      method: 'POST',
      body: {
        query: `query { greeting(name: "Nuxt User") }`
      }
    })
    greetingResult.value = response.data.greeting
  } catch (error) {
    console.error('Greeting query failed:', error)
    greetingResult.value = 'Error: ' + error.message
  }
}

const fetchUsers = async () => {
  try {
    const response = await $fetch('/api/graphql', {
      method: 'POST',
      body: {
        query: `query { users { id name email createdAt } }`
      }
    })
    users.value = response.data.users
  } catch (error) {
    console.error('Users query failed:', error)
  }
}

const createUser = async () => {
  if (!newUser.value.name || !newUser.value.email) {
    alert('Please fill in both name and email')
    return
  }

  try {
    const response = await $fetch('/api/graphql', {
      method: 'POST',
      body: {
        query: `
          mutation CreateUser($input: CreateUserInput!) {
            createUser(input: $input) {
              id
              name
              email
              createdAt
            }
          }
        `,
        variables: {
          input: newUser.value
        }
      }
    })
    
    console.log('User created:', response.data.createUser)
    newUser.value = { name: '', email: '' }
    await fetchUsers() // Refresh users list
  } catch (error) {
    console.error('Create user failed:', error)
    alert('Failed to create user: ' + error.message)
  }
}
</script>
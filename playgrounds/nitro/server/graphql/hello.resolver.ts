import { defineResolver } from 'nitro-graphql/utils/define'

export const helloQueries = defineResolver({
  Query: {
    hello: () => 'Hello from auto-discovered resolver!',
    greeting: (_parent, { name }) => `Hello, ${name}!`,
    // These fields will be protected by the @auth directive
    profile: (_parent, _args, context) => {
      // This will only execute if the user passes the @auth directive check
      return {
        id: '1',
        name: context.user?.name || 'Test User',
        email: context.user?.email || 'test@example.com',
        role: context.user?.role || 'USER',
        bio: 'This is a test bio that might be very long and will be truncated by the transform directive',
        phone: '+1234567890',
        age: 25,
      }
    },
    adminData: () => {
      // This will only execute if the user has ADMIN role
      return 'Secret admin data'
    },
    // Cached fields
    expensiveData: async () => {
      // Simulate expensive operation
      console.log('Computing expensive data...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      return `Expensive data computed at ${new Date().toISOString()}`
    },
    userSpecificData: (_parent, _args, context) => {
      return `Data for user: ${context.user?.name || 'Anonymous'} at ${new Date().toISOString()}`
    },
    // Deprecated field
    oldEndpoint: () => {
      return 'This endpoint is deprecated'
    },
  },
})

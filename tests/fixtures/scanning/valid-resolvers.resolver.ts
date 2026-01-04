/**
 * Fixture: Valid resolver file with multiple named exports
 * Tests parsing of various define* function calls
 */
import { defineField, defineMutation, defineQuery, defineResolver, defineSubscription } from '../../../src/define'

// Query resolver
export const userQueries = defineQuery({
  user: async (_, { id }) => {
    return { id, name: 'Test User' }
  },
  users: async () => [],
})

// Mutation resolver
export const userMutations = defineMutation({
  createUser: async (_, { name }) => {
    return { id: '1', name }
  },
})

// Full resolver (combined query + mutation)
export const productResolvers = defineResolver({
  Query: {
    product: async (_, { id }) => ({ id }),
  },
  Mutation: {
    createProduct: async (_, { name }) => ({ id: '1', name }),
  },
})

// Field resolver for custom type
export const userFields = defineField({
  User: {
    fullName: parent => `${parent.firstName} ${parent.lastName}`,
  },
})

// Subscription resolver
export const notificationSubscriptions = defineSubscription({
  Subscription: {
    onNotification: {
      async* subscribe() {
        yield { message: 'Hello' }
      },
    },
  },
})

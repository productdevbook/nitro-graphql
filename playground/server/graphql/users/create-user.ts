import { createResolver } from 'nitro-graphql'

export default createResolver({
  Mutation: {
    createUser: async (_parent, { input }, context) => {
      // In a real app, you would save to database
      const newUser = {
        id: Date.now().toString(),
        ...input,
        createdAt: new Date(),
      }

      // Log using Nitro's storage (example)
      console.log('[GraphQL] New user created:', newUser)

      return newUser
    },
  },
})

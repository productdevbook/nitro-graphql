import { defineResolver } from 'nitro-graphql'

// Mock database
const users = [
  { id: '1', name: 'John Doe', email: 'john@example.com', createdAt: new Date('2024-01-01') },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', createdAt: new Date('2024-01-02') },
]

export default defineResolver({
  Query: {
    users: () => users,
    user: (_parent, { id }) => users.find(user => user.id === id) || null,
  },

  Mutation: {
    createUser: (_parent, { input }) => {
      const newUser = {
        id: (users.length + 1).toString(),
        ...input,
        createdAt: new Date(),
      }
      users.push(newUser)
      return newUser
    },
  },
})

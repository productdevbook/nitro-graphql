import { defineMutation, defineQuery } from '../../../src/define'

export const userQueries = defineQuery({
  user: async (_, { id }) => {
    return {
      id,
      name: 'Test User',
      email: 'test@example.com',
      createdAt: new Date().toISOString(),
    }
  },
  users: async () => {
    return []
  },
})

export const userMutations = defineMutation({
  createUser: async (_, { name, email }) => {
    return {
      id: '1',
      name,
      email,
      createdAt: new Date().toISOString(),
    }
  },
  updateUser: async (_, { id, name, email }) => {
    return {
      id,
      name: name || 'Updated User',
      email: email || 'updated@example.com',
      createdAt: new Date().toISOString(),
    }
  },
  deleteUser: async () => {
    return true
  },
})

import { generateId, users } from '../data'

export const createUserMutation = defineResolver({
  Mutation: {
    createUser: (_parent, { input }) => {
      const newUser = {
        id: generateId(),
        ...input,
        createdAt: new Date(),
      }

      users.push(newUser)
      console.log('[GraphQL] New user created:', newUser)

      return newUser
    },
  },
})

export const updateUserMutation = defineResolver({
  Mutation: {
    updateUser: (_parent, { id, input }) => {
      const userIndex = users.findIndex(user => user.id === id)

      if (userIndex === -1) {
        throw new Error(`User with id ${id} not found`)
      }

      const updatedUser = {
        ...users[userIndex],
        ...input,
      }

      users[userIndex] = updatedUser
      console.log('[GraphQL] User updated:', updatedUser)

      return updatedUser
    },
  },
})

export const deleteUserMutation = defineResolver({
  Mutation: {
    deleteUser: (_parent, { id }) => {
      const userIndex = users.findIndex(user => user.id === id)

      if (userIndex === -1) {
        throw new Error(`User with id ${id} not found`)
      }

      users.splice(userIndex, 1)
      console.log('[GraphQL] User deleted:', id)

      return true
    },
  },
})

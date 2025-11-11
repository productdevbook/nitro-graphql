import { defineResolver } from 'nitro-graphql/define'
import { generateId, users } from '../data'

export const createUserMutation = defineResolver({
  Mutation: {
    createUser: (_parent, args) => {
      // Note: Directives will validate these before they reach here
      const { name, email, age } = args

      const newUser = {
        id: generateId(),
        name,
        email,
        age,
        bio: null,
        phone: null,
        role: 'USER',
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

export const updateBioMutation = defineResolver({
  Mutation: {
    updateBio: (_parent, { userId, bio }) => {
      const user = users.find(u => u.id === userId)

      if (!user) {
        throw new Error(`User with id ${userId} not found`)
      }

      // Note: bio is already validated and transformed by directives
      user.bio = bio
      console.log('[GraphQL] User bio updated:', { userId, bio })

      return user
    },
  },
})

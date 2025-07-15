import { users } from '../data'

export const userQueries = defineResolver({
  Query: {
    users: () => {
      console.log('[GraphQL] Users query called')
      console.log('[GraphQL] Users array:', users)
      return users
    },
    user: (_parent, { id }) => {
      console.log('[GraphQL] User query called with id:', id)
      const user = users.find(user => user.id === id) || null
      console.log('[GraphQL] Found user:', user)
      return user
    },
  },
})

import { defineQuery } from 'nitro-graphql/define'
import { mockUsers } from './userStore'

export const data = defineQuery({
  getUser: (_parent, args) => {
    const user = mockUsers.find(u => u.id === args.id)
    return user || null
  },
})
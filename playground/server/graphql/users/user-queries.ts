import type { User } from '#build/graphql-types.generated'
import { createResolver } from 'nitro-graphql'

// Mock database
const users: User[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', createdAt: new Date('2024-01-01') },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', createdAt: new Date('2024-01-02') },
]

export default createResolver({
  Query: {
    users: () => users,
    user: (_parent, { id }) => users.find(user => user.id === id) || null,
    allUsers: () => users,
  },
})

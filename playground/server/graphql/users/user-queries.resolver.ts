import type { User } from '#graphql/server'

// Mock database
const users: User[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', createdAt: new Date('2024-01-01') },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', createdAt: new Date('2024-01-02') },
]

export const define1 = defineResolver({
  Query: {
    users: () => users,
    user: (_parent, { id }) => users.find(user => user.id === id) || null,
    allUsers: () => users,
  },
})

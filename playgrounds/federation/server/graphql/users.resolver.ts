interface User {
  id: string
  email: string
  name: string
}

// Mock data for demo
const users: User[] = [
  { id: '1', email: 'john@example.com', name: 'John Doe' },
  { id: '2', email: 'jane@example.com', name: 'Jane Smith' },
  { id: '3', email: 'bob@example.com', name: 'Bob Johnson' },
]

export const userQueries = defineQuery({
  user: (_, { id }: { id: string }) => {
    return users.find(user => user.id === id) || null
  },
  users: () => {
    return users
  },
})

export const userMutations = defineMutation({
  createUser: (_, { input }: { input: { email: string, name: string } }) => {
    const newUser: User = {
      id: String(users.length + 1),
      email: input.email,
      name: input.name,
    }
    users.push(newUser)
    return newUser
  },
})

// Federation: Entity resolver for User type
export const userTypeResolver = defineField({
  User: {
    __resolveReference: (user: { id: string }) => {
      return users.find(u => u.id === user.id) || null
    },
  },
})

import { defineQuery, defineMutation } from 'nitro-graphql/define'

export const userQueries = defineQuery({
  user: (_parent: any, { id }: { id: string }) => ({ id, name: 'Test User' }),
  users: () => [{ id: '1', name: 'User 1' }],
})

export const userMutations = defineMutation({
  createUser: (_parent: any, { name }: { name: string }) => ({ id: '123', name }),
})

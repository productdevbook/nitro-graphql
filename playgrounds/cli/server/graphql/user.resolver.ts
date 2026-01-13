import { defineMutation, defineQuery } from 'nitro-graphql/define'

export const cliQueries = defineQuery({
  helloCI: () => 'Hello from CLI!',
  cliUser: (_parent: any, { id }: { id: string }) => ({
    id,
    name: 'CLI User',
    source: 'cli-playground',
  }),
  cliUsers: () => [
    { id: '1', name: 'CLI User 1', source: 'cli-playground' },
    { id: '2', name: 'CLI User 2', source: 'cli-playground' },
  ],
})

export const cliMutations = defineMutation({
  createCLIUser: (_parent: any, { name }: { name: string }) => ({
    id: Date.now().toString(),
    name,
    source: 'cli-playground',
  }),
})

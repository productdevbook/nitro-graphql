import type { QueryResolvers } from '../../types.generated'

export default {
  Query: {
    hello: () => 'Hello from auto-discovered resolver!',
    greeting: (_parent, { name }) => `Hello, ${name}!`,
  } as QueryResolvers,
}

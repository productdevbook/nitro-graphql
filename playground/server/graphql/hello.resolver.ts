export const define1 = defineResolver({
  Query: {
    hello: () => 'Hello from auto-discovered resolver!',
    greeting: (_parent, { name }) => `Hello, ${name}!`,
  },
})

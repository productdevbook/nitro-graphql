// Test pregenerated resolvers
export const resolvers = [
  {
    resolver: {
      Query: {
        pregenTest: () => 'Hello from pregenerated!',
      },
    },
  },
]

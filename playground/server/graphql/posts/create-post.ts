import { createResolver } from 'nitro-graphql-yoga'

export default createResolver({
  Mutation: {
    createPost: async (parent, { input }, context) => {
      return {
        id: Date.now().toString(),
        title: input.title,
        content: input.content,
        authorId: input.authorId,
      }
    },
  },
})

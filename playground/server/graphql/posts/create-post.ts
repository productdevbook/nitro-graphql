import { defineResolver } from 'nitro-graphql'

export default defineResolver({
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

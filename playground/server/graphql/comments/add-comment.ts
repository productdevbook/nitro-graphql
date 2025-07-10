import { createResolver } from 'nitro-graphql-yoga'

export default createResolver({
  Mutation: {
    addComment: async (parent, { input }, context) => {
      return {
        id: Date.now().toString(),
        content: input.content,
        postId: input.postId,
        authorId: input.authorId,
      }
    },
  },
})

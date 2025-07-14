export const define1 = defineResolver({
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

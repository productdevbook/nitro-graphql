export default createResolver({
  Query: {
    comments: async (parent, { postId }, context) => {
      return [
        { id: '1', content: 'Great post!', postId, authorId: '1' },
        { id: '2', content: 'Nice work!', postId, authorId: '2' },
      ]
    },
  },

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

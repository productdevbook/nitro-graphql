export default createResolver({
  Query: {
    post: async (parent, { id }, context) => {
      return {
        id,
        title: `Post ${id}`,
        content: `This is the content of post ${id}`,
        authorId: '1',
      }
    },

    posts: async (parent, args, context) => {
      return [
        { id: '1', title: 'First Post', content: 'Content 1', authorId: '1' },
        { id: '2', title: 'Second Post', content: 'Content 2', authorId: '2' },
      ]
    },
  },

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

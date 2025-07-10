import { defineResolver } from 'nitro-graphql'

export default defineResolver({
  Query: {
    comments: async (parent, { postId }, context) => {
      return [
        { id: '1', content: 'Great post!', postId, authorId: '1' },
        { id: '2', content: 'Nice work!', postId, authorId: '2' },
      ]
    },
  },
})

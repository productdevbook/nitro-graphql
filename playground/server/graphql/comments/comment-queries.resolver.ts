export const define1 = defineQuery({
  comments: async (parent, { postId }, context) => {
    return [
      { id: '1', content: 'Great post!', postId, authorId: '1' },
      { id: '2', content: 'Nice work!', postId, authorId: '2' },
    ]
  },
})

export const define2 = defineMutation({
  addComment: async (parent, { input }, context) => {
    const newComment = { id: '3', ...input, authorId: '1' }
    // Here you would typically save the new comment to the database
    return newComment
  },
})

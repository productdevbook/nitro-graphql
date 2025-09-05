// Layer GraphQL Resolvers - Posts
const mockPosts = [
  {
    id: '1',
    title: 'First Post from Layer',
    content: 'This is a post defined in a Nuxt layer!',
    author: 'Layer Author',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'GraphQL Layers Example',
    content: 'Demonstrating how GraphQL schemas can be shared across Nuxt layers.',
    author: 'Nitro GraphQL',
    createdAt: new Date().toISOString(),
  },
]

export const postQueries = defineQuery({
  posts: () => mockPosts,
  post: (parent, { id }) => mockPosts.find(post => post.id === id),
})

export const postMutations = defineMutation({
  createPost: (parent, { input }) => {
    const newPost = {
      id: String(mockPosts.length + 1),
      ...input,
      createdAt: new Date().toISOString(),
    }
    mockPosts.push(newPost)
    return newPost
  },
})

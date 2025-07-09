export default defineEventHandler(() => {
  return {
    message: 'Welcome to Nitro GraphQL Yoga Example!',
    graphql: '/graphql',
  }
})
// Custom GraphQL Yoga configuration
export default defineGraphQLConfig({
  // Custom context enhancer - adds additional properties to GraphQL context

  graphiql: true,
  // Additional yoga options can be added here
  // See: https://the-guild.dev/graphql/yoga-server/docs
  context: ({}) => {},
})

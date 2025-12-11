import { defineGraphQLConfig } from 'nitro-graphql/utils/define'

// Custom GraphQL Yoga configuration
export default defineGraphQLConfig({
  // Custom context enhancer - adds additional properties to GraphQL context

  // Additional yoga options can be added here
  // See: https://the-guild.dev/graphql/yoga-server/docs
  context: (context) => {
    const innerContext = (context as any).context
    const auth = innerContext?.auth

    console.log(context.context)
  },
})

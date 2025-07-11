
// Custom GraphQL Yoga configuration
export default defineYogaConfig({
  // Custom context enhancer - adds additional properties to GraphQL context
  context: async ({ request }) => {
    const event = request.$$event

    return {
      event,
      request,
      storage: useStorage(),
      // Add custom context properties
      startTime: Date.now(),
      userAgent: event?.node?.req?.headers?.['user-agent'] || 'unknown',
    }
  },

  // Additional yoga options can be added here
  // See: https://the-guild.dev/graphql/yoga-server/docs
})

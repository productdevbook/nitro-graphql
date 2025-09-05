export default defineNitroConfig({
  modules: [
    'nitro-graphql',
  ],
  graphql: {
    framework: 'apollo-server',
    federation: {
      enabled: true,
      serviceName: 'users-service',
      serviceVersion: '1.0.0',
      serviceUrl: 'http://localhost:3000/api/graphql',
    },
  },
})

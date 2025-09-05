export default defineNitroConfig({
  srcDir: 'server',
  modules: [
    'nitro-graphql',
  ],
  graphql: {
    framework: 'graphql-yoga',
    federation: {
      enabled: true,
      serviceName: 'users-service-yoga',
      serviceVersion: '1.0.0',
      serviceUrl: 'http://localhost:3000/api/graphql',
    },
  },
})

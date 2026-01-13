import { defineConfig } from 'nitro-graphql/cli';

export default defineConfig({
  framework: 'graphql-yoga',
  serverDir: 'src/graphql',
  clientDir: 'graphql',
  buildDir: '.graphql',

  codegen: {
    server: {
      // Vercube context type
      contextType: '../../src/types/graphql-context#GraphQLContext',
      skipValidationSchemas: true,
    },
    // TypeGraphQL gereksiz - kendi decorator sistemimiz var
    // typeGraphQL: { enabled: false },
  },
});

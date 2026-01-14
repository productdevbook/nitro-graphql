import { createApp } from '@vercube/core';
import { GraphQLPlugin } from 'nitro-graphql/vercube';
import { useContainer } from '@/boot/Container';

async function main() {
  const app = await createApp({
    setup: async (app) => {
      // Add GraphQL plugin (must be in setup to run before init())
      app.addPlugin(GraphQLPlugin, {
        serverDir: 'src/graphql',
      });
    },
  });

  // Register controllers and resolvers (after init, router is ready)
  app.container.expand(useContainer);

  await app.listen();
}

await main();

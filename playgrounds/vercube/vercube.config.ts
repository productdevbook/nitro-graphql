import { defineConfig } from '@vercube/core';

export default defineConfig({
  logLevel: 'debug',

  server: {
    port: 3000,
  },

  build: {
    // Mark nitro-graphql as external to avoid bundling issues with native modules
    // @ts-expect-error - rolldown external config
    external: ['nitro-graphql', 'nitro-graphql/vercube', /nitro-graphql\/.*/],
  },
});

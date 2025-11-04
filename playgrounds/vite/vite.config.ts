import { graphql } from 'nitro-graphql/vite'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  plugins: [
    // NEW: Single import pattern - graphql() auto-registers the Nitro module
    graphql({
      framework: 'graphql-yoga',
      paths: {
        serverGraphql: 'routes/graphql',
      },
    }),
    nitro(),
  ],
  nitro: {
    preset: 'standard',
    // modules: ['nitro-graphql'], // No longer needed! The Vite plugin auto-registers
  },
}))

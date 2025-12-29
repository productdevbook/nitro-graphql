import { defineConfig } from 'tsdown'
import packageJson from './package.json' with { type: 'json' }

const { dependencies, peerDependencies } = packageJson

const playgrounds = './playgrounds'

const thisPath = import.meta.url
const playgroundPath = new URL(playgrounds, thisPath).pathname

export default defineConfig({
  entry: [
    // Main entry points
    'src/index.ts',
    'src/define.ts',
    // Core (framework-agnostic)
    'src/core/**',
    // CLI
    'src/cli/**',
    // Ecosystem (framework-specific)
    'src/ecosystem/**',
    // GraphQL type stubs
    'src/graphql/**',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  name: 'nitro-graphql',
  unbundle: true,
  external: [
    'nitro-graphql',
    'nitro',
    'nitro/types',
    'graphql',
    'graphql-yoga',
    '#nitro-graphql/server-schemas',
    '#nitro-graphql/server-resolvers',
    '#nitro-graphql/server-directives',
    '#nitro-graphql/graphql-config',
    '#nitro-graphql/module-config',
    '#nitro-graphql/debug-info',
    '@nuxt/kit',
    '@nuxt/schema',
    '@apollo/server',
    '@apollo/server/plugin/landingPage/default',
    'nitro-graphql/utils/apollo',
    'vite',
    '#graphql/server',
    ...Object.keys(dependencies || {}),
    ...Object.keys(peerDependencies || {}),
  ],
  ignoreWatch: [
    playgroundPath,
  ],
})

import { defineConfig } from 'tsdown'
import packageJson from './package.json' with { type: 'json' }

const { dependencies, peerDependencies, devDependencies } = packageJson

const playground = './playground'
const playgroundNuxt = './playground-nuxt'

const thisPath = import.meta.url
const playgroundPath = new URL(playground, thisPath).pathname
const playgroundNuxtPath = new URL(playgroundNuxt, thisPath).pathname

export default defineConfig({
  entry: [
    'src/graphql/**',
    'src/index.ts',
    'src/codegen.ts',
    'src/client-watcher.ts',
    'src/context.ts',
    'src/utils/**',
    'src/routes/**',
    'src/graphql.d.ts',
    'src/ecosystem/**',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  name: 'nitro-graphql',
  unbundle: true,
  external: [
    'nitro-graphql',
    'nitropack',
    'nitropack/types',
    'nitropack/kit',
    'graphql',
    'graphql-yoga',
    'h3',
    '#nitro-internal-virtual/server-schemas',
    '#nitro-internal-virtual/server-resolvers',
    '#nitro-internal-virtual/server-directives',
    '#nitro-internal-virtual/graphql-config',
    '@nuxt/kit',
    '@nuxt/schema',
    '@apollo/server',
    '@apollo/server/plugin/landingPage/default',
    '#graphql/server',
    ...Object.keys(dependencies || {}),
    ...Object.keys(peerDependencies || {}),
  ],
  ignoreWatch: [
    playgroundPath,
    playgroundNuxtPath,
  ],
})

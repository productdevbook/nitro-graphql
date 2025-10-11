import { defineConfig } from 'tsdown'
import packageJson from './package.json' with { type: 'json' }

const { dependencies, peerDependencies } = packageJson

const playgrounds = './playgrounds'

const thisPath = import.meta.url
const playgroundPath = new URL(playgrounds, thisPath).pathname

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
    'nitro',
    'nitro/types',
    'graphql',
    'graphql-yoga',
    'h3',
    '#nitro-internal-virtual/server-schemas',
    '#nitro-internal-virtual/server-resolvers',
    '#nitro-internal-virtual/server-directives',
    '#nitro-internal-virtual/graphql-config',
    '#nitro-internal-virtual/module-config',
    '@nuxt/kit',
    '@nuxt/schema',
    '@apollo/server',
    '@apollo/server/plugin/landingPage/default',
    'nitro-graphql/utils/apollo',
    '#graphql/server',
    ...Object.keys(dependencies || {}),
    ...Object.keys(peerDependencies || {}),
  ],
  ignoreWatch: [
    playgroundPath,
  ],
})

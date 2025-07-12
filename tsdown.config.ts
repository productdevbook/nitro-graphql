import { defineConfig } from 'tsdown'
import { dependencies } from './package.json'

const playground = './playground'
const playgroundNuxt = './playground-nuxt'

const thisPath = import.meta.url
const playgroundPath = new URL(playground, thisPath).pathname
const playgroundNuxtPath = new URL(playgroundNuxt, thisPath).pathname

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/codegen.ts',
    'src/client-watcher.ts',
    'src/context.ts',
    'src/utils/index.ts',
    'src/types.ts',
    'src/routes',
    'src/internal/index.ts',
    'src/graphql.d.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  name: 'nitro-graphql',
  fixedExtension: true,
  unbundle: true,
  external: [
    'nitro-graphql/types',
    'nitropack',
    'nitropack/types',
    'nitropack/kit',
    'graphql',
    'graphql-yoga',
    '@graphql-tools/schema',
    'h3',
    '#nitro-internal-virtual/server-defs',
    '#nitro-internal-virtual/server-resolvers',
    ...Object.keys(dependencies || {}),
  ],
  ignoreWatch: [
    playgroundPath,
    playgroundNuxtPath,
  ],
})

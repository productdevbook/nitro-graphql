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
    'src/utils.ts',
    'src/types.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  name: 'nitro-graphql',
  unbundle: true,
  external: [
    'nitro-graphql/types',
    'nitropack',
    'nitropack/types',
    'nitropack/kit',
    'graphql',
    'graphql-yoga',
    '@graphql-tools/schema',
    ...Object.keys(dependencies || {}),
  ],
  ignoreWatch: [
    playgroundPath,
    playgroundNuxtPath,
  ],
})

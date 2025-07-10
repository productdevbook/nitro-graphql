import { defineConfig } from 'tsdown'
import { dependencies } from './package.json'

const playground = './playground'

const thisPath = import.meta.url
const playgroundPath = new URL(playground, thisPath).pathname

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/codegen.ts',
    'src/watcher.ts',
    'src/client-watcher.ts',
    'src/context.ts',
    'src/utils.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  external: [
    'nitropack',
    'nitropack/types',
    'nitropack/kit',
    'graphql',
    'graphql-yoga',
    '@graphql-tools/schema',
    'node:fs',
    'node:path',
    ...Object.keys(dependencies || {}),
  ],
  ignoreWatch: [
    playgroundPath,
  ],
})

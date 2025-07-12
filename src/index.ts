import type { Nitro } from 'nitropack/types'

import { fileURLToPath } from 'node:url'
import { defineNitroModule } from 'nitropack/kit'
import { dirname, join, resolve } from 'pathe'
import { rollupConfig } from './rollup'
import { relativeWithDot, scanSchema } from './utils'

export default defineNitroModule({
  name: 'nitro:graphql-yoga',
  async setup(nitro: Nitro) {
    if (!nitro.options.dev) {
      nitro.options.rollupConfig ??= {} as any
      if (nitro.options.rollupConfig) {
        nitro.options.rollupConfig.plugins ??= []

        const originalExternal = nitro.options.rollupConfig.external
        nitro.options.rollupConfig.external = (id, parentId, isResolved) => {
          if (id.startsWith('./dev')) {
            return true
          }
          if (id.startsWith('./prerender') && !nitro.options.prerender) {
            return true
          }

          // Orijinal external logic'i koru
          if (typeof originalExternal === 'function') {
            return originalExternal(id, parentId, isResolved)
          }
          if (Array.isArray(originalExternal)) {
            return originalExternal.includes(id)
          }
          return false
        }
      }
    }

    nitro.hooks.hook('dev:start', async () => {
      const schemas = await scanSchema(nitro)
      nitro.scanDefs = schemas
    })

    const schemas = await scanSchema(nitro)
    await rollupConfig(nitro)

    nitro.options.virtual['#nitro-internal-virtual/bbbb'] = () => {
      return /* js */ `export const defs = 'asdas'
      `
    }

    // Add GraphQL Yoga handlers
    const aendpoint = '/api/graphql'

    const runtime = fileURLToPath(
      new URL('routes', import.meta.url),
    )
    // Main GraphQL endpoint
    nitro.options.handlers.push({
      route: aendpoint,
      handler: join(runtime, 'graphql'),
      method: 'get',
    })

    // Main GraphQL endpoint
    nitro.options.handlers.push({
      route: aendpoint,
      handler: join(runtime, 'graphql'),
      method: 'post',
    })

    nitro.options.handlers.push({
      route: aendpoint,
      handler: join(runtime, 'graphql'),
      method: 'options',
    })

    return

    const tsConfigPath = resolve(
      nitro.options.buildDir,
      nitro.options.typescript.tsconfigPath,
    )
    const tsconfigDir = dirname(tsConfigPath)
    const typesDir = resolve(nitro.options.buildDir, 'types')

    nitro.hooks.hook('types:extend', (types) => {
      // Add TypeScript path alias for IDE support
      types.tsConfig ||= {}
      types.tsConfig.compilerOptions ??= {}
      types.tsConfig.compilerOptions.paths ??= {}
      // types.tsConfig.compilerOptions.paths['#build/graphql-types.generated'] = [
      //   join(nitro.options.buildDir, 'types', 'graphql-types.generated.ts'),
      // ]
      types.tsConfig.compilerOptions.paths['#graphql/server'] = [
        relativeWithDot(tsconfigDir, join(typesDir, 'graphql-types.generated.ts')),
      ]
      types.tsConfig.compilerOptions.paths['#graphql/client'] = [
        relativeWithDot(tsconfigDir, join(typesDir, 'graphql-client.generated.ts')),
      ]
      types.tsConfig.include = types.tsConfig.include || []
      types.tsConfig.include.push(
        relativeWithDot(tsconfigDir, join(typesDir, 'graphql-client.generated.ts')),
        relativeWithDot(tsconfigDir, join(typesDir, 'graphql-types.generated.ts')),
        relativeWithDot(tsconfigDir, join(typesDir, 'graphql.d.ts')),
      )
    })

    // Add GraphQL path to known chunk prefixes
    const graphqlPath = join(nitro.options.srcDir, 'graphql')

    // Access the internal rollup config and add our prefix
    nitro.hooks.hook('rollup:before', (nitro, rollupConfig) => {
      // Add codegen packages as external dependencies to prevent bundling
      rollupConfig.external = rollupConfig.external || []
      const codegenExternals = [
        '@graphql-codegen/core',
        '@graphql-codegen/typescript',
        '@graphql-codegen/typescript-resolvers',
        '@graphql-codegen/typescript-operations',
        '@graphql-codegen/typescript-generic-sdk',
        '@graphql-tools/graphql-file-loader',
        '@graphql-tools/load',
      ]

      if (Array.isArray(rollupConfig.external)) {
        rollupConfig.external.push(...codegenExternals)
      }
      else if (typeof rollupConfig.external === 'function') {
        const originalExternal = rollupConfig.external
        rollupConfig.external = (id, parent, isResolved) => {
          if (codegenExternals.some(external => id.includes(external))) {
            return true
          }
          return originalExternal(id, parent, isResolved)
        }
      }

      // Add GraphQL path to chunkNamePrefixes
      const originalChunkFileNames = rollupConfig.output.chunkFileNames
      rollupConfig.output.chunkFileNames = (chunk) => {
        // Only GraphQL resolvers (actual resolver files) should go to graphql folder
        const allIds = chunk.moduleIds || []

        const hasGraphQLResolverFile = allIds.some(id =>
          // Only server/graphql resolver files (not node_modules, not virtual modules)
          id.includes(graphqlPath)
          && !id.includes('node_modules')
          && !id.includes('#nitro-graphql')
          && (id.endsWith('.ts') || id.endsWith('.js') || id.endsWith('.mjs')),
        )

        if (hasGraphQLResolverFile) {
          return `chunks/graphql/[name].mjs`
        }
        // Use original logic for other chunks
        if (typeof originalChunkFileNames === 'function') {
          return originalChunkFileNames(chunk)
        }
        return originalChunkFileNames || 'chunks/_/[name].mjs'
      }
    })
  },
})

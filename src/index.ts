import type { Nitro } from 'nitropack/types'
import type { NitroGraphQLOptions } from './types'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { watch } from 'chokidar'
import defu from 'defu'

import { defineNitroModule } from 'nitropack/kit'
import { dirname, join, resolve } from 'pathe'
import { rollupConfig } from './rollup'
import { relativeWithDot, scanDefs, scanResolvers } from './utils'
import { clientTypeGeneration, serverTypeGeneration } from './utils/server-type-generation'

export type * from './types'

export {
  defineGraphQLConfig,
  defineMutation,
  defineQuery,
  defineResolver,
  defineSchema,
  defineSubscription,
  defineType,
} from './utils/define'

// This is the main entry point for the nitro-graphql module.
// It sets up the module, configures the GraphQL endpoints, and handles type generation.
export interface Resolvers extends Record<string, any> {

}

export type GraphQLFramework = 'graphql-yoga'

export default defineNitroModule({
  name: 'nitro-graphql',
  async setup(nitro: Nitro) {
    nitro.options.externals = nitro.options.externals || {}
    nitro.options.externals.external ??= []
    nitro.options.externals.external.push('oxc-parser')
    nitro.options.externals.external.push('@oxc-parser')

    nitro.graphql ||= {
      buildDir: '',
      watchDirs: [],
      clientDir: '',
      serverDir: resolve(nitro.options.srcDir, 'graphql'),
    }

    nitro.hooks.hook('rollup:before', (nitro, rollupConfig) => {
      rollupConfig.external = rollupConfig.external || []
      const codegenExternals = [
        'oxc-parser',
        '@oxc-parser',
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
    })

    nitro.options.runtimeConfig.graphql = defu(nitro.options.runtimeConfig.graphql || {}, {
      endpoint: {
        graphql: '/api/graphql',
        healthCheck: '/api/graphql/health',
      },
      playground: true,
    } as NitroGraphQLOptions)

    const graphqlBuildDir = resolve(nitro.options.buildDir, 'graphql')
    nitro.graphql.buildDir = graphqlBuildDir

    const watchDirs: string[] = []

    switch (nitro.options.framework.name) {
      case 'nuxt':
        watchDirs.push(join(nitro.options.rootDir, 'app', 'graphql'))
        nitro.graphql.clientDir = resolve(nitro.options.rootDir, 'app', 'graphql')
        break
      default:
    }

    const watcher = watch(watchDirs, {
      persistent: true,
      ignoreInitial: true,
      ignored: nitro.options.ignore,
    }).on('all', async (event, path) => {
      if (path.endsWith('.graphql') || path.endsWith('.gql')) {
        await clientTypeGeneration(nitro, path)
      }
    })

    nitro.hooks.hook('close', () => {
      watcher.close()
    })

    const tsConfigPath = resolve(
      nitro.options.buildDir,
      nitro.options.typescript.tsconfigPath,
    )
    const tsconfigDir = dirname(tsConfigPath)
    const typesDir = resolve(nitro.options.buildDir, 'types')

    const defs = await scanDefs(nitro)
    nitro.scanDefs = defs

    const resolvers = await scanResolvers(nitro)
    nitro.scanResolvers = resolvers

    nitro.hooks.hook('dev:start', async () => {
      const defs = await scanDefs(nitro)
      nitro.scanDefs = defs

      const resolvers = await scanResolvers(nitro)
      nitro.scanResolvers = resolvers
    })

    await rollupConfig(nitro)

    // Generate server and client types
    await serverTypeGeneration(nitro)
    await clientTypeGeneration(nitro, nitro.graphql.clientDir)

    const runtime = fileURLToPath(
      new URL('routes', import.meta.url),
    )
    // Main GraphQL endpoint
    const methods = ['get', 'post', 'options'] as const
    if (nitro.options.graphql?.framework === 'graphql-yoga') {
      // Register the GraphQL Yoga handler for all methods
      for (const method of methods) {
        nitro.options.handlers.push({
          route: nitro.options.runtimeConfig.graphql?.endpoint?.graphql || '/api/graphql',
          handler: join(runtime, 'graphql-yoga'),
          method,
        })
      }
    }

    if (nitro.options.graphql?.framework === 'apollo-server') {
      // Register the Apollo Server handler for all methods
      for (const method of methods) {
        nitro.options.handlers.push({
          route: nitro.options.runtimeConfig.graphql?.endpoint?.graphql || '/api/graphql',
          handler: join(runtime, 'apollo-server'),
          method,
        })
      }
    }

    // Health check endpoint
    nitro.options.handlers.push({
      route: nitro.options.runtimeConfig.graphql?.endpoint?.healthCheck || '/api/graphql/health',
      handler: join(runtime, 'health'),
      method: 'get',
    })

    // Auto-import utilities
    if (nitro.options.imports) {
      nitro.options.imports.presets.push({
        from: 'nitro-graphql',
        imports: [
          'defineResolver',
          'defineYogaConfig',
          'defineGraphQLSchema',
          'defineMutation',
          'defineQuery',
          'defineSubscription',
          'defineType',
          'defineGraphQLConfig',
        ],
      })
    }

    // Access the internal rollup config and add our prefix
    nitro.hooks.hook('rollup:before', (nitro, rollupConfig) => {
      const manualChunks = rollupConfig.output?.manualChunks
      const chunkFiles = rollupConfig.output?.chunkFileNames

      if (!rollupConfig.output.inlineDynamicImports) {
        rollupConfig.output.manualChunks = (id, meta) => {
          if (id.endsWith('.graphql') || id.endsWith('.gql')) {
            return 'schemas'
          }

          // resolsvers and defs are not in the same directory, so we need to check both
          if (id.endsWith('.resolver.ts')) {
            return 'resolvers'
          }

          if (typeof manualChunks === 'function') {
            return manualChunks(id, meta)
          }
          // If manualChunks is not a function, do not call it
          return undefined
        }
      }

      rollupConfig.output.chunkFileNames = (chunkInfo) => {
        // GraphQL dosyalarını kontrol et
        if (chunkInfo.moduleIds && chunkInfo.moduleIds.some(id =>
          id.includes('/graphql/') || id.includes('.graphql') || id.includes('.resolver.ts') || id.includes('.gql'),
        )) {
          return `chunks/graphql/[name].mjs`
        }

        // Use original logic for other chunks
        if (typeof chunkFiles === 'function') {
          return chunkFiles(chunkInfo)
        }

        // Unknown path
        return `chunks/_/[name].mjs`
      }
    })

    const graphqlDtsContent = `// Auto-generated by nitro-graphql

import type { Resolvers as Test } from './nitro-graphql-server.d.ts'

declare module 'nitro-graphql' {
  interface Resolvers extends Test {}

  type GraphQLFramework = '${nitro.options.graphql?.framework || 'graphql-yoga'}'
}
`

    writeFileSync(join(typesDir, 'graphql.d.ts'), graphqlDtsContent)
    nitro.options.typescript.strict = true

    nitro.hooks.hook('types:extend', (types) => {
      // Add TypeScript path alias for IDE support
      types.tsConfig ||= {}
      types.tsConfig.compilerOptions ??= {}
      types.tsConfig.compilerOptions.paths ??= {}
      types.tsConfig.compilerOptions.paths['#graphql/server'] = [
        relativeWithDot(tsconfigDir, join(typesDir, 'nitro-graphql-server.d.ts')),
      ]
      types.tsConfig.compilerOptions.paths['#graphql/client'] = [
        relativeWithDot(tsconfigDir, join(typesDir, 'nitro-graphql-client.d.ts')),
      ]
      types.tsConfig.compilerOptions.paths['#graphql/schemas'] = [
        relativeWithDot(tsconfigDir, join(nitro.graphql.serverDir, 'schemas.ts')),
      ]
      types.tsConfig.include = types.tsConfig.include || []
      types.tsConfig.include.push(
        relativeWithDot(tsconfigDir, join(typesDir, 'nitro-graphql-server.d.ts')),
        relativeWithDot(tsconfigDir, join(typesDir, 'nitro-graphql-client.d.ts')),
        relativeWithDot(tsconfigDir, join(typesDir, 'graphql.d.ts')),
      )
    })
  },
})

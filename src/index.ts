import type { Nitro } from 'nitropack/types'
import type { NitroGraphQLOptions } from './types'

import { defineNitroModule } from 'nitropack/kit'
import { dirname, join, resolve } from 'pathe'
import { devmode } from './dev'
import { relativeWithDot } from './utils'

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

    // Get module options from nitro config
    const options: NitroGraphQLOptions = {
      endpoint: '/api/graphql',
      playground: true,
      cors: false,
      cacheHeaders: {
        enabled: true,
        maxAge: 604800, // 1 week
      },
      client: {
        enabled: nitro.options.framework?.name === 'nuxt',
        outputPath: undefined, // Will default to buildDir/types/graphql-client.generated.ts
        watchPatterns: undefined, // Will default to src/**/*.{graphql,gql} excluding server/graphql
        config: {
          documentMode: 'string',
          emitLegacyCommonJSImports: false,
          useTypeImports: true,
          enumsAsTypes: true,
        },
      },
      // Merge with user config from nitro.options
      ...(nitro.options as any).graphqlYoga,
      // Fallback to runtimeConfig for backward compatibility
      ...nitro.options.runtimeConfig?.graphqlYoga,
    }

    devmode(nitro, options)

    // Add virtual imports
    nitro.options.virtual ??= {}

    // Add context type
    nitro.options.virtual['#nitro-graphql/context'] = () => `
export type { GraphQLContext } from 'nitro-graphql/context'
`

    // Add GraphQL Yoga handlers
    nitro.options.handlers = nitro.options.handlers || []
    const endpoint = options.endpoint || '/api/graphql'

    if (nitro.options.prerender || nitro.options.dev) {
      const { prerender } = await import('./prerender')
      await prerender(nitro, options)
    }
    // Main GraphQL endpoint
    nitro.options.handlers.push({
      route: endpoint,
      handler: '#nitro-graphql/handler',
      method: 'get',
    })

    nitro.options.handlers.push({
      route: endpoint,
      handler: '#nitro-graphql/handler',
      method: 'post',
    })

    nitro.options.handlers.push({
      route: endpoint,
      handler: '#nitro-graphql/handler',
      method: 'options',
    })

    // Health check endpoint
    nitro.options.handlers.push({
      route: `${endpoint}/health`,
      handler: '#nitro-graphql/health',
      method: 'get',
    })

    // Health check handler
    nitro.options.virtual['#nitro-graphql/health'] = () => `
import { defineEventHandler, setResponseStatus } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const response = await $fetch('${endpoint}', {
      method: 'POST',
      body: {
        query: 'query Health { __typename }',
        operationName: 'Health',
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    })
    
    if (response && typeof response === 'object' && 'data' in response) {
      return {
        status: 'healthy',
        message: 'GraphQL server is running',
        timestamp: new Date().toISOString(),
      }
    }
    
    throw new Error('Invalid response from GraphQL server')
  } catch (error) {
    setResponseStatus(event, 503)
    return {
      status: 'unhealthy',
      message: error.message || 'GraphQL server is not responding',
      timestamp: new Date().toISOString(),
    }
  }
})
`

    // Auto-import utilities
    if (nitro.options.imports) {
      nitro.options.imports.presets.push({
        from: 'nitro-graphql/utils',
        imports: [
          'defineResolver',
          'defineYogaConfig',
        ],
      })
    }

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

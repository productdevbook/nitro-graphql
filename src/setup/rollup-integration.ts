/**
 * Rollup/Rolldown integration for chunking GraphQL files
 * Configures smart chunking to reduce bundle size (~98% reduction)
 */

import type { Nitro } from 'nitro/types'
// import type { OutputOptions } from 'rollup'
import {
  CHUNK_NAME_RESOLVERS,
  CHUNK_NAME_SCHEMAS,
  CHUNK_PATH_GRAPHQL,
  CHUNK_PATH_UNKNOWN,
  DIR_ROUTES_GRAPHQL,
  DIR_SERVER_GRAPHQL,
  GRAPHQL_EXTENSIONS,
  RESOLVER_EXTENSIONS,
} from '../constants'

/**
 * Setup Rollup/Rolldown chunking configuration for GraphQL files
 * Creates separate chunks for schemas and resolvers to optimize bundle size
 */
export function setupRollupChunking(nitro: Nitro): void {
  nitro.hooks.hook('rollup:before', (_, rollupConfig) => {
    const manualChunks = rollupConfig.output?.manualChunks
    const chunkFiles = rollupConfig.output?.chunkFileNames

    if (!rollupConfig.output.inlineDynamicImports) {
      // manualChunks for Rollup
      rollupConfig.output.manualChunks = (id: string, _meta: unknown) => {
        // Handle schema files (.graphql, .gql)
        if (isGraphQLFile(id)) {
          return getSchemaChunkName(id)
        }

        // Handle resolver files (.resolver.ts)
        if (isResolverFile(id)) {
          return getResolverChunkName(id)
        }

        if (typeof manualChunks === 'function') {
          // @ts-expect-error - Rollup type compatibility
          return manualChunks(id, meta)
        }
        return undefined
      }

      // advancedChunks for Rolldown - merge all GraphQL files into single chunks
      rollupConfig.output.advancedChunks = {
        groups: [
          {
            // All schemas into single chunk
            name: CHUNK_NAME_SCHEMAS,
            test: new RegExp(`\\.(${GRAPHQL_EXTENSIONS.map(e => e.slice(1)).join('|')})$`),
          },
          {
            // All resolvers into single chunk
            name: CHUNK_NAME_RESOLVERS,
            test: /\.resolver\.(ts|js)$/,
          },
        ],
        minSize: 0,
        minShareCount: 1,
      }
    }

    rollupConfig.output.chunkFileNames = (chunkInfo: { moduleIds?: string[] }) => {
      // Check for GraphQL files
      if (chunkInfo.moduleIds && chunkInfo.moduleIds.some((id: string) =>
        isGraphQLFile(id) || isResolverFile(id),
      )) {
        return CHUNK_PATH_GRAPHQL
      }

      // Use original logic for other chunks
      if (typeof chunkFiles === 'function') {
        return chunkFiles(chunkInfo)
      }

      // Unknown path
      return CHUNK_PATH_UNKNOWN
    }
  })
}

/**
 * Check if a file is a GraphQL schema file
 */
function isGraphQLFile(id: string): boolean {
  return GRAPHQL_EXTENSIONS.some(ext => id.endsWith(ext))
}

/**
 * Check if a file is a resolver file
 */
function isResolverFile(id: string): boolean {
  return RESOLVER_EXTENSIONS.some(ext => id.endsWith(ext))
}

/**
 * Get chunk name for GraphQL schema files
 * All schemas are bundled into a single chunk since GraphQL server
 * merges them at runtime anyway - no benefit from separate chunks
 */
function getSchemaChunkName(_id: string): string {
  return CHUNK_NAME_SCHEMAS
}

/**
 * Get chunk name for resolver files
 * All resolvers are bundled into a single chunk since GraphQL server
 * requires all resolvers to be registered at startup - no runtime lazy loading
 */
function getResolverChunkName(_id: string): string {
  return CHUNK_NAME_RESOLVERS
}

/**
 * Configure external dependencies for Rollup
 * Marks codegen and federation packages as external
 */
export function setupRollupExternals(nitro: Nitro): void {
  nitro.hooks.hook('rollup:before', (_, rollupConfig) => {
    rollupConfig.external = rollupConfig.external || []

    const codegenExternals = [
      'oxc-parser',
      '@oxc-parser',
    ]

    const allExternals = [...codegenExternals]

    // Apollo Federation is optional - only mark as external if NOT enabled
    // (if enabled, it will be bundled; if not, it won't be imported at all)
    if (!nitro.options.graphql?.federation?.enabled) {
      const federationExternals = [
        '@apollo/subgraph',
        '@apollo/federation-internals',
        '@apollo/cache-control-types',
      ]
      allExternals.push(...federationExternals)
    }

    if (Array.isArray(rollupConfig.external)) {
      rollupConfig.external.push(...allExternals)
    }
    else if (typeof rollupConfig.external === 'function') {
      const originalExternal = rollupConfig.external
      rollupConfig.external = (id: string, parent: string | undefined, isResolved: boolean) => {
        if (allExternals.some(external => id.includes(external))) {
          return true
        }
        return originalExternal(id, parent, isResolved)
      }
    }
  })
}

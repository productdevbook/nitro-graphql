/**
 * Rollup/Rolldown integration for chunking GraphQL files
 * Configures smart chunking to reduce bundle size (~98% reduction)
 */

import type { Nitro } from 'nitro/types'
// import type { OutputOptions } from 'rollup'
import {
  CHUNK_NAME_RESOLVERS,
  CHUNK_NAME_SCHEMAS,
  CHUNK_PATH_UNKNOWN,
  GRAPHQL_EXTENSIONS,
  RESOLVER_EXTENSIONS,
} from '../../core/constants'

/**
 * Configure noExternals to ensure nitro-graphql route handlers are bundled
 * This is critical for Nuxt integration where node_modules are externalized by default.
 * Without this, the #nitro-graphql/* virtual imports in handlers would fail at runtime.
 */
export function setupNoExternals(nitro: Nitro): void {
  // Add nitro-graphql routes to noExternals so they get bundled
  // This ensures #nitro-graphql/* virtual imports are resolved at build time
  const routePatterns: RegExp[] = [
    // Match nitro-graphql route files
    /nitro-graphql[/\\]dist[/\\]nitro[/\\]routes/,
    // Match nitro-graphql core schema builder (used by routes)
    /nitro-graphql[/\\]dist[/\\]core[/\\]schema/,
  ]

  // noExternals can be true (bundle all) or an array
  if (nitro.options.noExternals === true) {
    return // Already bundling everything
  }

  if (!Array.isArray(nitro.options.noExternals)) {
    nitro.options.noExternals = []
  }

  nitro.options.noExternals.push(...routePatterns)
}

/**
 * Setup Rollup/Rolldown chunking configuration for GraphQL files
 * Creates separate chunks for schemas and resolvers to optimize bundle size
 *
 * Note: For Rolldown, we only use manualChunks (not advancedChunks) to avoid
 * interfering with Nitro's node_modules chunking which uses advancedChunks.
 */
export function setupRollupChunking(nitro: Nitro): void {
  nitro.hooks.hook('rollup:before', (_, rollupConfig) => {
    // TODO: Skip if advancedChunks is used?
    return
    // Skip if inlineDynamicImports is enabled
    if (rollupConfig.output.inlineDynamicImports) {
      return
    }

    // Use manualChunks for both Rollup and Rolldown
    // This doesn't interfere with Nitro's advancedChunks for node_modules
    const existingManualChunks = rollupConfig.output?.manualChunks

    rollupConfig.output.manualChunks = (id: string, meta: unknown) => {
      // Handle schema files (.graphql, .gql)
      if (isGraphQLFile(id)) {
        return `graphql/${CHUNK_NAME_SCHEMAS}`
      }

      // Handle resolver files (.resolver.ts, .resolver.js)
      if (isResolverFile(id)) {
        return `graphql/${CHUNK_NAME_RESOLVERS}`
      }

      // Use existing manualChunks if defined
      if (typeof existingManualChunks === 'function') {
        // @ts-expect-error - Rollup type compatibility
        return existingManualChunks(id, meta)
      }

      return undefined
    }

    // chunkFileNames: only override for graphql chunks
    const existingChunkFileNames = rollupConfig.output.chunkFileNames

    rollupConfig.output.chunkFileNames = (chunkInfo: { name?: string, moduleIds?: string[] }) => {
      const name = chunkInfo.name || ''

      // GraphQL chunks get special path
      if (name.startsWith('graphql/')) {
        return `chunks/${name}.mjs`
      }

      // Use existing logic for other chunks
      if (typeof existingChunkFileNames === 'function') {
        // @ts-expect-error - Simplified chunkInfo for our use case
        return existingChunkFileNames(chunkInfo)
      }
      if (typeof existingChunkFileNames === 'string') {
        return existingChunkFileNames
      }

      // Fallback
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
 * Configure external dependencies for Rollup
 * Marks codegen and federation packages as external
 */
export function setupRollupExternals(nitro: Nitro): void {
  nitro.hooks.hook('rollup:before', (_, rollupConfig) => {
    rollupConfig.external = rollupConfig.external || []

    const codegenExternals = [
      'oxc-parser',
      '@oxc-parser',
      // Ensure single graphql instance across all modules
      'graphql',
      // Native modules must be external - they contain binary .node files
      'nitro-graphql/native',
      'nitro-graphql-darwin-arm64',
      'nitro-graphql-darwin-x64',
      'nitro-graphql-darwin-universal',
      'nitro-graphql-linux-x64-gnu',
      'nitro-graphql-linux-x64-musl',
      'nitro-graphql-linux-arm64-gnu',
      'nitro-graphql-linux-arm64-musl',
      'nitro-graphql-win32-x64-msvc',
      'nitro-graphql-win32-x64-gnu',
      'nitro-graphql-win32-arm64-msvc',
      'nitro-graphql-win32-ia32-msvc',
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

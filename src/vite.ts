import type { Nitro } from 'nitro/types'
import type { Plugin } from 'vite'
import type { NitroGraphQLOptions } from './types'
import { readFile } from 'node:fs/promises'
import defu from 'defu'
import { setupNitroGraphQL } from './setup'

/**
 * Vite plugin to load GraphQL files as strings AND auto-register Nitro module
 * This prevents Vite from trying to parse .graphql/.gql files as JavaScript
 * and automatically sets up the nitro-graphql module via the nitro: hook
 *
 * @example
 * ```ts
 * import { defineConfig } from 'vite'
 * import { nitro } from 'nitro/vite'
 * import { graphql } from 'nitro-graphql/vite'
 *
 * export default defineConfig({
 *   plugins: [
 *     graphql({ framework: 'graphql-yoga' }), // Auto-registers Nitro module
 *     nitro()
 *   ]
 * })
 * ```
 */
export function graphql(options?: NitroGraphQLOptions): Plugin {
  return {
    name: 'nitro-graphql:vite',
    enforce: 'pre', // Run before other plugins to prevent Vite from transforming GraphQL files

    async load(id) {
      // Only handle .graphql and .gql files
      if (!/\.(?:graphql|gql)$/i.test(id))
        return null

      try {
        const content = await readFile(id, 'utf-8')
        // Export GraphQL content as a string
        return `export default ${JSON.stringify(content)}`
      }
      catch (error) {
        // File not found - let Vite handle it
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
          return null

        // Re-throw other errors
        throw error
      }
    },

    // NEW: Nitro integration hook
    // This automatically registers the nitro-graphql module when the Vite plugin is used
    // @ts-expect-error - nitro hook is a Nitro v3 feature not yet in Vite Plugin types
    nitro: {
      async setup(nitro: Nitro) {
        // Merge plugin options with existing nitro.options.graphql config
        // Priority: existing nitro.options.graphql → plugin options → defaults
        if (options) {
          nitro.options.graphql = defu(nitro.options.graphql || {}, options)
        }

        // Mark that Vite plugin is being used (for client code generation)
        nitro.options.graphql = nitro.options.graphql || {}
        // @ts-expect-error - adding custom flag
        nitro.options.graphql._vitePlugin = true

        // Run the shared setup logic
        await setupNitroGraphQL(nitro)
      },
    },
  }
}

import type { Plugin } from 'vite'
import { readFile } from 'node:fs/promises'

/**
 * Vite plugin to load GraphQL files as strings
 * This prevents Vite from trying to parse .graphql/.gql files as JavaScript
 *
 * @example
 * ```ts
 * import { defineConfig } from 'vite'
 * import { nitro } from 'nitro/vite'
 * import { graphql } from 'nitro-graphql/vite'
 *
 * export default defineConfig({
 *   plugins: [
 *     graphql(), // Must be before nitro()
 *     nitro()
 *   ]
 * })
 * ```
 */
export function graphql(): Plugin {
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
  }
}

import type { Nitro } from 'nitro/types'

import { readFile } from 'node:fs/promises'
import { parse } from 'graphql'
import { NitroAdapter } from './adapter'
import { registerAllVirtualModules } from './virtual/generators'

const GRAPHQL_FILE_RE = /\.(?:graphql|gql)$/i

export async function rollupConfig(nitro: Nitro) {
  // Register virtual modules in nitro.options.virtual
  // Nitro's virtual() plugin reads from this when creating the plugin
  registerAllVirtualModules(nitro)

  nitro.hooks.hook('rollup:before', (_, rollupConfig) => {
    rollupConfig.plugins = rollupConfig.plugins || []
    const {
      include = GRAPHQL_FILE_RE,
      exclude,
      validate = false,
    } = nitro.options.graphql?.loader || {}

    if (Array.isArray(rollupConfig.plugins)) {
      // Note: We don't need a custom virtual module plugin here
      // Nitro's built-in virtual() plugin already handles nitro.options.virtual
      // See: src/build/plugins/virtual.ts in Nitro source

      // GraphQL file loader plugin
      rollupConfig.plugins.push({
        name: 'nitro-graphql',

        resolveId: {
          order: 'pre',
          handler(id) {
            // Mark GraphQL files as external to prevent Vite SSR transformation
            if (GRAPHQL_FILE_RE.test(id)) {
              return null // Let this plugin handle it
            }
          },
        },

        load: {
          order: 'pre',
          async handler(id) {
            if (exclude?.test?.(id))
              return null
            if (!include.test(id))
              return null

            try {
              const content = await readFile(id, 'utf-8')

              // Optional: GraphQL syntax validation
              if (validate) {
                parse(content) // Throws an error if invalid
              }

              return `export default ${JSON.stringify(content)}`
            }
            catch (error) {
              if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
                return null
              }
              const message = error instanceof Error ? error.message : String(error)
              this.error(`Failed to read GraphQL file ${id}: ${message}`)
            }
          },
        },
      })

      // Only add watcher in development mode
      if (nitro.options.dev) {
        rollupConfig.plugins.push({
          name: 'nitro-graphql-watcher',
          buildStart: {
            order: 'pre',
            async handler() {
              const result = await NitroAdapter.scanGraphql(nitro)

              for (const file of result.items) {
                this.addWatchFile(file)
              }
            },
          },
        })
      }
    }
  })
}

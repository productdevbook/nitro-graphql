import type { Nitro } from 'nitro/types'

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { parse } from 'graphql'
import { NitroAdapter } from './adapter'
import { generateClientTypes, generateServerTypes } from './codegen'
import { registerAllVirtualModules } from './virtual/generators'

export async function rollupConfig(nitro: Nitro) {
  // Register all virtual module generators
  registerAllVirtualModules(nitro)

  nitro.hooks.hook('rollup:before', (_, rollupConfig) => {
    rollupConfig.plugins = rollupConfig.plugins || []
    const {
      include = /\.(?:graphql|gql)$/i,
      exclude,
      validate = false,
    } = nitro.options.graphql?.loader || {}

    if (Array.isArray(rollupConfig.plugins)) {
      // Add resolve plugin for #nitro-graphql virtual modules
      // This mimics Nitro's nitro:resolve-ids plugin for #nitro-internal-virtual
      rollupConfig.plugins.push({
        name: 'nitro-graphql:virtual',
        resolveId: {
          order: 'pre',
          filter: {
            id: /^#nitro-graphql\//,
          },
          async handler(id: string, parent: string | undefined, _options: unknown) {
            // Handle initial imports TO our virtual modules (mark them as virtual)
            if (id.startsWith('#nitro-graphql/')) {
              return `\0virtual:${id}`
            }

            // Handle imports FROM our virtual modules (resolve dependencies)
            if (parent?.startsWith('\0virtual:#nitro-graphql')) {
              const runtimeDir = fileURLToPath(new URL('routes', import.meta.url))
              const internalRes = await this.resolve(id, runtimeDir, {
                skipSelf: true,
              })

              if (internalRes) {
                return internalRes.id
              }
            }

            return null
          },
        },
        load: {
          order: 'pre',
          filter: {
            id: /^\0virtual:#nitro-graphql\//,
          },
          async handler(id) {
            // Handle loading virtual modules
            if (id.startsWith('\0virtual:#nitro-graphql/')) {
              const moduleName = id.slice('\0virtual:'.length)
              const generator = nitro.options.virtual?.[moduleName]

              if (typeof generator === 'function') {
                try {
                  return {
                    code: await generator(),
                    moduleType: 'js',
                  }
                }
                catch (error) {
                  const message = error instanceof Error ? error.message : String(error)
                  this.error(`Failed to generate virtual module ${moduleName}: ${message}`)
                }
              }
              else {
                this.error(`No generator function found for virtual module ${moduleName}`)
              }
            }
          },
        },
      })

      rollupConfig.plugins.push({
        name: 'nitro-graphql',

        resolveId: {
          order: 'pre',
          handler(id) {
            // Mark GraphQL files as external to prevent Vite SSR transformation
            if (/\.(?:graphql|gql)$/i.test(id)) {
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

  nitro.hooks.hook('dev:reload', async () => {
    await generateServerTypes(nitro, { silent: true })
    await generateClientTypes(nitro, { silent: true })
  })
}

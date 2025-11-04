import type { Nitro } from 'nitro/types'

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { parse } from 'graphql'
import { genImport } from 'knitwork'
import { resolve } from 'pathe'
import { getImportId, scanGraphql } from './utils'
import { clientTypeGeneration, serverTypeGeneration } from './utils/type-generation'

export async function rollupConfig(app: Nitro) {
  virtualSchemas(app)
  virtualResolvers(app)
  virtualDirectives(app)
  getGraphQLConfig(app)
  virtualModuleConfig(app)
  virtualDebugInfo(app)

  app.hooks.hook('rollup:before', (nitro, rollupConfig) => {
    rollupConfig.plugins = rollupConfig.plugins || []
    const {
      include = /\.(?:graphql|gql)$/i,
      exclude,
      validate = false,
    } = app.options.graphql?.loader || {}

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
          async handler(id, parent, options) {
            // Handle initial imports TO our virtual modules (mark them as virtual)
            if (id.startsWith('#nitro-graphql/')) {
              return `\0virtual:${id}`
            }

            // Handle imports FROM our virtual modules (resolve dependencies)
            if (parent?.startsWith('\0virtual:#nitro-graphql')) {
              const runtimeDir = fileURLToPath(new URL('routes', import.meta.url))
              const internalRes = await this.resolve(id, runtimeDir, {
                skipSelf: true,
                ...options,
              })

              if (internalRes) {
                return internalRes
              }
            }
          },
        },
        load: {
          order: 'pre',
          filter: {
            id: /^\0virtual:#nitro-graphql\//,
          },
          handler(id) {
            // Handle loading virtual modules
            if (id.startsWith('\0virtual:#nitro-graphql/')) {
              const moduleName = id.slice('\0virtual:'.length)
              const generator = app.options.virtual?.[moduleName]

              if (typeof generator === 'function') {
                try {
                  return {
                    code: generator(),
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
      if (app.options.dev) {
        rollupConfig.plugins.push({
          name: 'nitro-graphql-watcher',
          buildStart: {
            order: 'pre',
            async handler() {
              const graphqlFiles = await scanGraphql(nitro)

              for (const file of graphqlFiles) {
                this.addWatchFile(file)
              }
            },
          },
        })
      }
    }
  })

  app.hooks.hook('dev:reload', async () => {
    await serverTypeGeneration(app)
    await clientTypeGeneration(app)
  })
}

export function virtualSchemas(app: Nitro) {
  const getSchemas = () => [
    ...app.scanSchemas,
    ...(app.options.graphql?.typedefs ?? []),
  ]

  app.options.virtual ??= {}
  app.options.virtual['#nitro-graphql/server-schemas'] = () => {
    try {
      const imports = getSchemas()

      if (imports.length === 0) {
        if (app.options.dev) {
          app.logger.warn('[nitro-graphql] No schemas found. Virtual module will export empty array.')
        }
        return 'export const schemas = []'
      }

      const importStatements = imports.map(handler => `import ${getImportId(handler)} from '${handler}';`)
      const schemaArray = imports.map(h => `{ def: ${getImportId(h)} }`)

      const code = /* js */`
${importStatements.join('\n')}

export const schemas = [
${schemaArray.join(',\n')}
];
    `

      return code
    }
    catch (error) {
      app.logger.error('[nitro-graphql] Failed to generate virtual schema module:', error)
      return 'export const schemas = []'
    }
  }
}

export function virtualResolvers(app: Nitro) {
  const getResolvers = () => [...app.scanResolvers]

  app.options.virtual ??= {}
  app.options.virtual['#nitro-graphql/server-resolvers'] = () => {
    try {
      const imports = getResolvers()

      if (imports.length === 0) {
        if (app.options.dev) {
          app.logger.warn('[nitro-graphql] No resolvers found. Virtual module will export empty array.')
        }
        return 'export const resolvers = []'
      }

      const importsContent: string[] = []
      const invalidImports: string[] = []

      for (const { specifier, imports: importList, options } of imports) {
        try {
          // Validate import structure
          if (!importList || importList.length === 0) {
            invalidImports.push(`${specifier}: No exports found`)
            continue
          }

          // Generate import statement
          const importCode = genImport(specifier, importList, options)
          importsContent.push(importCode)
        }
        catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          invalidImports.push(`${specifier}: ${message}`)
          if (app.options.dev) {
            app.logger.error(`[nitro-graphql] Failed to generate import for ${specifier}:`, error)
          }
        }
      }

      // Show warnings for invalid imports
      if (invalidImports.length > 0 && app.options.dev) {
        app.logger.warn('[nitro-graphql] Some resolver imports could not be generated:')
        for (const msg of invalidImports) {
          app.logger.warn(`  - ${msg}`)
        }
      }

      const data = imports
        .map(({ imports: importList }) =>
          importList.map(i => `{ resolver: ${i.as} }`).join(',\n'),
        )
        .filter(Boolean)
        .join(',\n')

      const content = [
        ...importsContent,
        '',
        'export const resolvers = [',
        data,
        ']',
        '',
      ]

      const code = content.join('\n')

      return code
    }
    catch (error) {
      app.logger.error('[nitro-graphql] Failed to generate virtual resolver module:', error)
      // Return empty module to prevent build failure
      return 'export const resolvers = []'
    }
  }
}

export function virtualDirectives(app: Nitro) {
  const getDirectives = () => app.scanDirectives || []

  app.options.virtual ??= {}
  app.options.virtual['#nitro-graphql/server-directives'] = () => {
    try {
      const imports = getDirectives()

      if (imports.length === 0) {
        // Directives are optional, no warning needed
        return 'export const directives = []'
      }

      const importsContent: string[] = []
      const invalidImports: string[] = []

      for (const { specifier, imports: importList, options } of imports) {
        try {
          if (!importList || importList.length === 0) {
            invalidImports.push(`${specifier}: No exports found`)
            continue
          }

          const importCode = genImport(specifier, importList, options)
          importsContent.push(importCode)
        }
        catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          invalidImports.push(`${specifier}: ${message}`)
          if (app.options.dev) {
            app.logger.error(`[nitro-graphql] Failed to generate import for directive ${specifier}:`, error)
          }
        }
      }

      if (invalidImports.length > 0 && app.options.dev) {
        app.logger.warn('[nitro-graphql] Some directive imports could not be generated:')
        for (const msg of invalidImports) {
          app.logger.warn(`  - ${msg}`)
        }
      }

      const data = imports
        .map(({ imports: importList }) =>
          importList.map(i => `{ directive: ${i.as} }`).join(',\n'),
        )
        .filter(Boolean)
        .join(',\n')

      const content = [
        ...importsContent,
        '',
        'export const directives = [',
        data,
        ']',
        '',
      ]

      const code = content.join('\n')

      return code
    }
    catch (error) {
      app.logger.error('[nitro-graphql] Failed to generate virtual directive module:', error)
      return 'export const directives = []'
    }
  }
}

export function getGraphQLConfig(app: Nitro) {
  const configPath = resolve(app.graphql.serverDir, 'config.ts')

  app.options.virtual ??= {}
  app.options.virtual['#nitro-graphql/graphql-config'] = () => {
    return `import config from '${configPath}'
const importedConfig = config
export { importedConfig }
`
  }
}

export function virtualModuleConfig(app: Nitro) {
  app.options.virtual ??= {}
  app.options.virtual['#nitro-graphql/module-config'] = () => {
    const moduleConfig = app.options.graphql || {}

    return `export const moduleConfig = ${JSON.stringify(moduleConfig, null, 2)};`
  }
}

export function virtualDebugInfo(app: Nitro) {
  app.options.virtual ??= {}
  app.options.virtual['#nitro-graphql/debug-info'] = () => {
    // Generate virtual module codes by calling their generator functions
    const virtualModuleCodes: Record<string, string> = {}

    try {
      // Get schemas virtual module code
      const schemasGenerator = app.options.virtual['#nitro-graphql/server-schemas']
      if (schemasGenerator && typeof schemasGenerator === 'function') {
        virtualModuleCodes['server-schemas'] = schemasGenerator() as string
      }
    }
    catch (error) {
      virtualModuleCodes['server-schemas'] = `// Error generating: ${error instanceof Error ? error.message : String(error)}`
    }

    try {
      // Get resolvers virtual module code
      const resolversGenerator = app.options.virtual['#nitro-graphql/server-resolvers']
      if (resolversGenerator && typeof resolversGenerator === 'function') {
        virtualModuleCodes['server-resolvers'] = resolversGenerator() as string
      }
    }
    catch (error) {
      virtualModuleCodes['server-resolvers'] = `// Error generating: ${error instanceof Error ? error.message : String(error)}`
    }

    try {
      // Get directives virtual module code
      const directivesGenerator = app.options.virtual['#nitro-graphql/server-directives']
      if (directivesGenerator && typeof directivesGenerator === 'function') {
        virtualModuleCodes['server-directives'] = directivesGenerator() as string
      }
    }
    catch (error) {
      virtualModuleCodes['server-directives'] = `// Error generating: ${error instanceof Error ? error.message : String(error)}`
    }

    try {
      // Get module config virtual module code
      const moduleConfigGenerator = app.options.virtual['#nitro-graphql/module-config']
      if (moduleConfigGenerator && typeof moduleConfigGenerator === 'function') {
        virtualModuleCodes['module-config'] = moduleConfigGenerator() as string
      }
    }
    catch (error) {
      virtualModuleCodes['module-config'] = `// Error generating: ${error instanceof Error ? error.message : String(error)}`
    }

    try {
      // Get graphql config virtual module code
      const graphqlConfigGenerator = app.options.virtual['#nitro-graphql/graphql-config']
      if (graphqlConfigGenerator && typeof graphqlConfigGenerator === 'function') {
        virtualModuleCodes['graphql-config'] = graphqlConfigGenerator() as string
      }
    }
    catch (error) {
      virtualModuleCodes['graphql-config'] = `// Error generating: ${error instanceof Error ? error.message : String(error)}`
    }

    const debugInfo = {
      isDev: app.options.dev,
      framework: app.options.framework.name,
      graphqlFramework: app.options.graphql?.framework,
      federation: app.options.graphql?.federation,
      scanned: {
        schemas: app.scanSchemas?.length || 0,
        schemaFiles: app.scanSchemas || [],
        resolvers: app.scanResolvers?.length || 0,
        resolverFiles: app.scanResolvers || [],
        directives: app.scanDirectives?.length || 0,
        directiveFiles: app.scanDirectives || [],
        documents: app.scanDocuments?.length || 0,
        documentFiles: app.scanDocuments || [],
      },
      virtualModules: virtualModuleCodes,
    }

    return `export const debugInfo = ${JSON.stringify(debugInfo, null, 2)};`
  }
}

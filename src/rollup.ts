import type { Nitro } from 'nitropack'

import { readFile } from 'node:fs/promises'
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
      include = /\.(graphql|gql)$/i,
      exclude,
      validate = false,
    } = app.options.graphql?.loader || {}

    if (Array.isArray(rollupConfig.plugins)) {
      rollupConfig.plugins.push({
        name: 'nitro-graphql',

        async load(id) {
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
      })

      rollupConfig.plugins.push({
        name: 'nitro-graphql-watcher',
        async buildStart() {
          const graphqlFiles = await scanGraphql(nitro)
          // const clientGraphqlFiles = await scanClient(nitro)

          for (const file of graphqlFiles) {
            this.addWatchFile(file)
          }

          // for (const file of clientGraphqlFiles) {
          //   this.addWatchFile(file)
          // }

          // 2. Directory watching (partial çalışır)
          this.addWatchFile(app.graphql.serverDir)

          // 3. Client GraphQL files
          // if (app.options.framework.name === 'nuxt') {
          //   this.addWatchFile('app/graphql/')
          // }
        },
      })
    }
  })

  app.hooks.hook('dev:reload', async () => {
    await serverTypeGeneration(app)
    await clientTypeGeneration(app)
  })
}

export function virtualSchemas(app: Nitro) {
  const getSchemas = () => {
    const schemas: string[] = [
      ...app.scanSchemas,
      ...(app.options.graphql?.typedefs ?? []),
    ]

    return schemas
  }

  app.options.virtual ??= {}
  app.options.virtual['#nitro-internal-virtual/server-schemas'] = () => {
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
  const getResolvers = () => {
    const resolvers = [
      ...app.scanResolvers,
      // ...(app.options.graphql?.resolvers ?? []),
    ]

    return resolvers
  }

  app.options.virtual ??= {}
  app.options.virtual['#nitro-internal-virtual/server-resolvers'] = () => {
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
  const getDirectives = () => {
    const directives = [
      ...(app.scanDirectives || []),
    ]

    return directives
  }

  app.options.virtual ??= {}
  app.options.virtual['#nitro-internal-virtual/server-directives'] = () => {
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
  app.options.virtual['#nitro-internal-virtual/graphql-config'] = () => {
    return `import config from '${configPath}'
const importedConfig = config
export { importedConfig }
`
  }
}

export function virtualModuleConfig(app: Nitro) {
  app.options.virtual ??= {}
  app.options.virtual['#nitro-internal-virtual/module-config'] = () => {
    // Merge graphql options with runtime config (includes resolved security)
    const moduleConfig = {
      ...app.options.graphql,
      // Get resolved security config from runtime config
      security: app.options.runtimeConfig.graphql?.security,
    }

    return `export const moduleConfig = ${JSON.stringify(moduleConfig, null, 2)};`
  }
}

export function virtualDebugInfo(app: Nitro) {
  app.options.virtual ??= {}
  app.options.virtual['#nitro-internal-virtual/debug-info'] = () => {
    // Generate virtual module codes by calling their generator functions
    const virtualModuleCodes: Record<string, string> = {}

    try {
      // Get schemas virtual module code
      const schemasGenerator = app.options.virtual['#nitro-internal-virtual/server-schemas']
      if (schemasGenerator && typeof schemasGenerator === 'function') {
        virtualModuleCodes['server-schemas'] = schemasGenerator() as string
      }
    }
    catch (error) {
      virtualModuleCodes['server-schemas'] = `// Error generating: ${error instanceof Error ? error.message : String(error)}`
    }

    try {
      // Get resolvers virtual module code
      const resolversGenerator = app.options.virtual['#nitro-internal-virtual/server-resolvers']
      if (resolversGenerator && typeof resolversGenerator === 'function') {
        virtualModuleCodes['server-resolvers'] = resolversGenerator() as string
      }
    }
    catch (error) {
      virtualModuleCodes['server-resolvers'] = `// Error generating: ${error instanceof Error ? error.message : String(error)}`
    }

    try {
      // Get directives virtual module code
      const directivesGenerator = app.options.virtual['#nitro-internal-virtual/server-directives']
      if (directivesGenerator && typeof directivesGenerator === 'function') {
        virtualModuleCodes['server-directives'] = directivesGenerator() as string
      }
    }
    catch (error) {
      virtualModuleCodes['server-directives'] = `// Error generating: ${error instanceof Error ? error.message : String(error)}`
    }

    try {
      // Get module config virtual module code
      const moduleConfigGenerator = app.options.virtual['#nitro-internal-virtual/module-config']
      if (moduleConfigGenerator && typeof moduleConfigGenerator === 'function') {
        virtualModuleCodes['module-config'] = moduleConfigGenerator() as string
      }
    }
    catch (error) {
      virtualModuleCodes['module-config'] = `// Error generating: ${error instanceof Error ? error.message : String(error)}`
    }

    try {
      // Get graphql config virtual module code
      const graphqlConfigGenerator = app.options.virtual['#nitro-internal-virtual/graphql-config']
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

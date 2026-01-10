/**
 * Virtual module generators for #nitro-graphql/*
 * Consolidated module using Nitro's { id, getCode } pattern (PR #3861)
 */

import type { Nitro } from 'nitro/types'
import type { GenImport } from '../types'
import { existsSync, readFileSync } from 'node:fs'
import { genImport } from 'knitwork'
import { resolve } from 'pathe'

// ============ HELPERS ============

function generateImportModule(
  items: GenImport[],
  exportName: string,
  wrapperKey: string,
): string {
  if (!items.length)
    return `export const ${exportName} = []`

  const imports = items.flatMap(({ specifier, imports: list, options }) =>
    list?.length ? [genImport(specifier, list, options)] : [],
  )
  const data = items.flatMap(({ imports: list }) =>
    list.map(i => `{ ${wrapperKey}: ${i.as || i.name} }`),
  )
  return `${imports.join('\n')}\n\nexport const ${exportName} = [\n${data.join(',\n')}\n]`
}

function safeGenerateModuleCode(nitro: Nitro, moduleName: string): string {
  try {
    const generator = nitro.options.virtual?.[moduleName]
    if (generator && typeof generator === 'function') {
      return generator() as string
    }
    return '// Module not found'
  }
  catch (error) {
    return `// Error: ${error instanceof Error ? error.message : String(error)}`
  }
}

// ============ VIRTUAL MODULE DEFINITIONS ============

export const serverSchemas = {
  id: '#nitro-graphql/server-schemas',
  getCode: (nitro: Nitro): string => {
    // All schemas (local + manifest) are now in nitro.scanSchemas
    const schemas = [...nitro.scanSchemas, ...(nitro.options.graphql?.typedefs ?? [])]
    const directiveSchemas = nitro.graphql.directiveSchemas

    if (!schemas.length && !directiveSchemas) {
      // Return demo schema when no schemas found
      if (nitro.options.dev) {
        nitro.logger.warn(`[nitro-graphql] No schemas found. Using demo schema. Add .graphql files to ${nitro.graphql.serverDir}`)
      }
      return `export const schemas = [
  { def: \`type Query {
  hello: String!
}
\` }
]`
    }

    // Inline schema contents directly to avoid runtime .graphql import issues
    const schemaArray: string[] = schemas.map((schemaPath) => {
      try {
        const content = readFileSync(schemaPath, 'utf-8')
        return `{ def: ${JSON.stringify(content)} }`
      }
      catch {
        // Fallback to import if file can't be read (shouldn't happen)
        return `{ def: '' }`
      }
    })

    // Add inline directive schemas if present
    if (directiveSchemas) {
      schemaArray.push(`{ def: ${JSON.stringify(directiveSchemas)} }`)
    }

    return `export const schemas = [\n${schemaArray.join(',\n')}\n];`
  },
}

export const serverResolvers = {
  id: '#nitro-graphql/server-resolvers',
  getCode: (nitro: Nitro): string => {
    // All resolvers (local + manifest) are now in nitro.scanResolvers
    const imports = [...nitro.scanResolvers]

    if (!imports.length) {
      // Return demo resolver when no resolvers found
      if (nitro.options.dev) {
        nitro.logger.warn(`[nitro-graphql] No resolvers found. Using demo resolver. Add .resolver.ts files to ${nitro.graphql.serverDir}`)
      }
      return `export const resolvers = [
  { resolver: { Query: { hello: () => 'Hello from nitro-graphql!' } } }
]`
    }

    return generateImportModule(imports, 'resolvers', 'resolver')
  },
}

export const serverDirectives = {
  id: '#nitro-graphql/server-directives',
  getCode: (nitro: Nitro): string => {
    const imports = nitro.scanDirectives || []
    if (!imports.length) {
      return 'export const directives = []'
    }
    return generateImportModule(imports, 'directives', 'directive')
  },
}

export const graphqlConfig = {
  id: '#nitro-graphql/graphql-config',
  getCode: (nitro: Nitro): string => {
    const localConfigPath = resolve(nitro.graphql.serverDir, 'config.ts')
    const extendConfigs = nitro.graphql.extendConfigs || []
    const hasLocalConfig = existsSync(localConfigPath)

    // No configs at all - return empty
    if (!hasLocalConfig && extendConfigs.length === 0) {
      return `const importedConfig = {}
export { importedConfig }
`
    }

    // Build imports and merge statement
    const imports: string[] = ['import { defu } from \'defu\'']
    const configNames: string[] = []

    // Import extend configs first (lower priority)
    extendConfigs.forEach((configPath, index) => {
      const configName = `extendConfig${index}`
      imports.push(`import ${configName} from '${configPath}'`)
      configNames.push(configName)
    })

    // Import local config last (highest priority)
    if (hasLocalConfig) {
      imports.push(`import localConfig from '${localConfigPath}'`)
      configNames.push('localConfig')
    }

    // Merge configs with defu (later configs have higher priority)
    // defu merges right-to-left, so we reverse to give local config highest priority
    const mergeArgs = configNames.reverse().join(', ')

    return `${imports.join('\n')}

const importedConfig = defu(${mergeArgs})
export { importedConfig }
`
  },
}

export const moduleConfig = {
  id: '#nitro-graphql/module-config',
  getCode: (nitro: Nitro): string => {
    const config = nitro.options.graphql || {}
    return `export const moduleConfig = ${JSON.stringify(config, null, 2)};`
  },
}

export const validationSchemas = {
  id: '#nitro-graphql/validation-schemas',
  getCode: (nitro: Nitro): string => {
    const localSchemaPath = resolve(nitro.graphql.serverDir, 'schema.ts')
    const extendSchemas = nitro.graphql.extendSchemas || []
    const hasLocalSchema = existsSync(localSchemaPath)

    // No schemas at all - return empty object
    if (!hasLocalSchema && extendSchemas.length === 0) {
      return `const mergedSchemas = {}
export default mergedSchemas
`
    }

    // Build imports and merge statement
    const imports: string[] = []
    const schemaNames: string[] = []

    // Import extend schemas first (lower priority)
    extendSchemas.forEach((schemaPath, index) => {
      const schemaName = `extendSchema${index}`
      imports.push(`import ${schemaName} from '${schemaPath}'`)
      schemaNames.push(schemaName)
    })

    // Import local schema last (highest priority)
    if (hasLocalSchema) {
      imports.push(`import localSchema from '${localSchemaPath}'`)
      schemaNames.push('localSchema')
    }

    // Merge schemas with spread (later schemas override earlier ones)
    const mergeExpression = schemaNames.length === 1
      ? schemaNames[0]
      : `{ ${schemaNames.map(name => `...${name}`).join(', ')} }`

    return `${imports.join('\n')}

const mergedSchemas = ${mergeExpression}
export default mergedSchemas
`
  },
}

export const pubsub = {
  id: '#nitro-graphql/pubsub',
  getCode: (nitro: Nitro): string => {
    const subscriptions = nitro.options.graphql?.subscriptions
    const pubsubConfig = subscriptions?.pubsub

    // If subscriptions not enabled, return null pubsub
    if (!subscriptions?.enabled) {
      return `export const pubsub = null`
    }

    // If custom PubSub path is provided, import from there
    if (pubsubConfig?.customPath) {
      return `import customPubSub from '${pubsubConfig.customPath}'
export const pubsub = customPubSub
`
    }

    // Default: use built-in PubSub
    return `import { createPubSub } from 'nitro-graphql/pubsub'
export const pubsub = createPubSub()
`
  },
}

export const debugInfo = {
  id: '#nitro-graphql/debug-info',
  getCode: (nitro: Nitro): string => {
    const virtualModuleCodes: Record<string, string> = {
      'server-schemas': safeGenerateModuleCode(nitro, '#nitro-graphql/server-schemas'),
      'server-resolvers': safeGenerateModuleCode(nitro, '#nitro-graphql/server-resolvers'),
      'server-directives': safeGenerateModuleCode(nitro, '#nitro-graphql/server-directives'),
      'module-config': safeGenerateModuleCode(nitro, '#nitro-graphql/module-config'),
      'graphql-config': safeGenerateModuleCode(nitro, '#nitro-graphql/graphql-config'),
      'pubsub': safeGenerateModuleCode(nitro, '#nitro-graphql/pubsub'),
    }

    const info = {
      isDev: nitro.options.dev,
      framework: nitro.options.framework.name,
      graphqlFramework: nitro.options.graphql?.framework,
      federation: nitro.options.graphql?.federation,
      scanned: {
        schemas: nitro.scanSchemas?.length || 0,
        schemaFiles: nitro.scanSchemas || [],
        resolvers: nitro.scanResolvers?.length || 0,
        resolverFiles: nitro.scanResolvers || [],
        directives: nitro.scanDirectives?.length || 0,
        directiveFiles: nitro.scanDirectives || [],
        documents: nitro.scanDocuments?.length || 0,
        documentFiles: nitro.scanDocuments || [],
      },
      virtualModules: virtualModuleCodes,
    }

    return `export const debugInfo = ${JSON.stringify(info, null, 2)};`
  },
}

// ============ REGISTRATION ============

const allModules = [
  serverSchemas,
  serverResolvers,
  serverDirectives,
  graphqlConfig,
  moduleConfig,
  validationSchemas,
  pubsub,
  debugInfo,
]

export function registerAllVirtualModules(nitro: Nitro): void {
  nitro.options.virtual ??= {}
  for (const mod of allModules) {
    nitro.options.virtual[mod.id] = () => mod.getCode(nitro)
  }
}

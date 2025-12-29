/**
 * Virtual module generators for #nitro-graphql/*
 * Consolidated module using Nitro's { id, getCode } pattern (PR #3861)
 */

import type { Nitro } from 'nitro/types'
import type { GenImport } from '../types'
import { genImport } from 'knitwork'
import { resolve } from 'pathe'
import { getImportId } from '../../../core'

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
    const schemas = [...nitro.scanSchemas, ...(nitro.options.graphql?.typedefs ?? [])]
    if (!schemas.length) {
      if (nitro.options.dev) {
        nitro.logger.warn('[nitro-graphql] No schemas found. Virtual module will export empty array.')
      }
      return 'export const schemas = []'
    }

    const importStatements = schemas.map(s => `import ${getImportId(s)} from '${s}';`)
    const schemaArray = schemas.map(s => `{ def: ${getImportId(s)} }`)

    return `${importStatements.join('\n')}\n\nexport const schemas = [\n${schemaArray.join(',\n')}\n];`
  },
}

export const serverResolvers = {
  id: '#nitro-graphql/server-resolvers',
  getCode: (nitro: Nitro): string => {
    const imports = [...nitro.scanResolvers]
    if (!imports.length) {
      if (nitro.options.dev) {
        nitro.logger.warn('[nitro-graphql] No resolvers found. Virtual module will export empty array.')
      }
      return 'export const resolvers = []'
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
    const configPath = resolve(nitro.graphql.serverDir, 'config.ts')
    return `import config from '${configPath}'
const importedConfig = config
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

export const debugInfo = {
  id: '#nitro-graphql/debug-info',
  getCode: (nitro: Nitro): string => {
    const virtualModuleCodes: Record<string, string> = {
      'server-schemas': safeGenerateModuleCode(nitro, '#nitro-graphql/server-schemas'),
      'server-resolvers': safeGenerateModuleCode(nitro, '#nitro-graphql/server-resolvers'),
      'server-directives': safeGenerateModuleCode(nitro, '#nitro-graphql/server-directives'),
      'module-config': safeGenerateModuleCode(nitro, '#nitro-graphql/module-config'),
      'graphql-config': safeGenerateModuleCode(nitro, '#nitro-graphql/graphql-config'),
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
  debugInfo,
]

export function registerAllVirtualModules(nitro: Nitro): void {
  nitro.options.virtual ??= {}
  for (const mod of allModules) {
    nitro.options.virtual[mod.id] = () => mod.getCode(nitro)
  }
}

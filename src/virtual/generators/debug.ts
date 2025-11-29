/**
 * Virtual module generator for #nitro-graphql/debug-info
 * Generates debug information for the debug dashboard
 */

import type { Nitro } from 'nitro/types'

/**
 * Safely call a virtual module generator and capture its output
 */
function safeGenerateModuleCode(
  nitro: Nitro,
  moduleName: string,
): string {
  try {
    const generator = nitro.options.virtual?.[moduleName]
    if (generator && typeof generator === 'function') {
      return generator() as string
    }
    return '// Module not found'
  }
  catch (error) {
    return `// Error generating: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * Generate virtual module code for debug info
 */
export function generateDebugInfoModule(nitro: Nitro): string {
  // Generate virtual module codes by calling their generator functions
  const virtualModuleCodes: Record<string, string> = {
    'server-schemas': safeGenerateModuleCode(nitro, '#nitro-graphql/server-schemas'),
    'server-resolvers': safeGenerateModuleCode(nitro, '#nitro-graphql/server-resolvers'),
    'server-directives': safeGenerateModuleCode(nitro, '#nitro-graphql/server-directives'),
    'module-config': safeGenerateModuleCode(nitro, '#nitro-graphql/module-config'),
    'graphql-config': safeGenerateModuleCode(nitro, '#nitro-graphql/graphql-config'),
  }

  const debugInfo = {
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

  return `export const debugInfo = ${JSON.stringify(debugInfo, null, 2)};`
}

/**
 * Register the debug info virtual module with Nitro
 */
export function virtualDebugInfo(nitro: Nitro): void {
  nitro.options.virtual ??= {}
  nitro.options.virtual['#nitro-graphql/debug-info'] = () => generateDebugInfoModule(nitro)
}

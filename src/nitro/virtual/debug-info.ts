/**
 * Virtual module: #nitro-graphql/debug-info
 * Provides debug information for the dev dashboard
 */

import type { Nitro } from 'nitro/types'
import { safeGenerateModuleCode } from './utils'

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

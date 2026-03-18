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
        schemas: nitro.graphql.state.schemas.length,
        schemaFiles: [...nitro.graphql.state.schemas],
        resolvers: nitro.graphql.state.resolvers.length,
        resolverFiles: [...nitro.graphql.state.resolvers],
        directives: nitro.graphql.state.directives.length,
        directiveFiles: [...nitro.graphql.state.directives],
        documents: nitro.graphql.state.documents.length,
        documentFiles: [...nitro.graphql.state.documents],
      },
      virtualModules: virtualModuleCodes,
    }

    return `export const debugInfo = ${JSON.stringify(info, null, 2)};`
  },
}

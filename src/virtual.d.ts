declare module '#nitro-internal-virtual/graphql-config' {
  import type { DefineServerConfig } from '#graphql/utils'

  export const importedConfig: Partial<DefineServerConfig>
}

declare module '#nitro-internal-virtual/server-directives' {
  import type { DirectiveDefinition } from '#graphql/utils'

  export const directives: Array<{ directive: DirectiveDefinition }>
}

declare module '#nitro-internal-virtual/server-resolvers' {
  import type { Resolvers } from '#graphql/server'

  export const resolvers: Array<{ resolver: Resolvers }>
}

declare module '#nitro-internal-virtual/server-schemas' {
  export const schemas: Array<{ def: string }>
}

declare module '#nitro-internal-virtual/server-scalars' {
  import type { GraphQLScalarType } from 'graphql'

  export const scalars: Record<string, GraphQLScalarType>
}

declare module '#nitro-internal-virtual/client-schema' {
  export const schema: string
}

declare module '#nitro-internal-virtual/module-config' {
  import type { NitroGraphQLOptions } from '../types'

  export const moduleConfig: Partial<NitroGraphQLOptions>
}

declare module '#nitro-internal-virtual/debug-info' {
  import type { GenImport } from '../types'

  export const debugInfo: {
    isDev: boolean
    framework: string
    graphqlFramework?: string
    federation?: any
    scanned: {
      schemas: number
      schemaFiles: string[]
      resolvers: number
      resolverFiles: GenImport[]
      directives: number
      directiveFiles: GenImport[]
      documents: number
      documentFiles: string[]
    }
    virtualModules: Record<string, string>
  }
}

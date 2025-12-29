declare module '#nitro-graphql/graphql-config' {
  import type { DefineServerConfig } from '#graphql/utils'

  export const importedConfig: Partial<DefineServerConfig>
}

declare module '#nitro-graphql/server-directives' {
  import type { DirectiveDefinition } from '#graphql/utils'

  export const directives: Array<{ directive: DirectiveDefinition }>
}

declare module '#nitro-graphql/server-resolvers' {
  import type { Resolvers } from '#graphql/server'

  export const resolvers: Array<{ resolver: Resolvers }>
}

declare module '#nitro-graphql/server-schemas' {
  export const schemas: Array<{ def: string }>
}

declare module '#nitro-graphql/server-scalars' {
  import type { GraphQLScalarType } from 'graphql'

  export const scalars: Record<string, GraphQLScalarType>
}

declare module '#nitro-graphql/client-schema' {
  export const schema: string
}

declare module '#nitro-graphql/module-config' {
  import type { NitroGraphQLOptions } from './ecosystem/nitro/types'

  export const moduleConfig: Partial<NitroGraphQLOptions>
}

declare module '#nitro-graphql/debug-info' {
  import type { GenImport } from './ecosystem/nitro/types'

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

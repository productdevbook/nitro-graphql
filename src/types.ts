import type { TypeScriptPluginConfig } from '@graphql-codegen/typescript'
import type { TypeScriptDocumentsPluginConfig } from '@graphql-codegen/typescript-operations'
import type { YogaServerOptions } from 'graphql-yoga'
import type { IncomingMessage, ServerResponse } from 'node:http'

export interface GraphQLSchemaConfig {
  typeDefs: string | string[]
  resolvers: any
}

export interface CodegenClientConfig extends TypeScriptPluginConfig, TypeScriptDocumentsPluginConfig {
  endpoint?: string
  documentMode?: 'string' | 'graphQLTag' | 'documentNode' | 'documentNodeImportFragments' | 'external'
}

export interface NitroGraphQLOptions {
  endpoint?: string
  healthCheckEndpoint?: string
  playground?: boolean
  cors?: YogaServerOptions<{ req: IncomingMessage, res: ServerResponse }, any>['cors']
  cacheHeaders?: {
    enabled?: boolean
    maxAge?: number
  }
  client?: {
    enabled?: boolean
    outputPath?: string
    watchPatterns?: string[]
    config?: CodegenClientConfig
  }
  yogaConfig?: Partial<YogaServerOptions<any, any>>
}

declare module 'nitropack' {
  interface NitroOptions {
    graphqlYoga?: NitroGraphQLOptions
  }

  interface NitroRuntimeConfig {
    graphqlYoga?: NitroGraphQLOptions
  }
}

export interface Resolvers {}

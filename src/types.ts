import type { YogaServerOptions } from 'graphql-yoga'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { TypeScriptPluginConfig } from '@graphql-codegen/typescript'
import type { TypeScriptDocumentsPluginConfig } from '@graphql-codegen/typescript-operations'

export interface GraphQLSchemaConfig {
  typeDefs: string | string[]
  resolvers: any
}

export interface CodegenClientConfig extends TypeScriptPluginConfig, TypeScriptDocumentsPluginConfig {
  endpoint?: string
  documentMode?: 'string' | 'graphQLTag' | 'documentNode' | 'documentNodeImportFragments' | 'external'
}

export interface NitroGraphQLYogaOptions {
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
}

declare module 'nitropack' {
  interface NitroOptions {
    graphqlYoga?: NitroGraphQLYogaOptions
  }
  
  interface NitroRuntimeConfig {
    graphqlYoga?: NitroGraphQLYogaOptions
  }
}

export interface Resolvers {}

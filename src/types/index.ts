import type { TypeScriptPluginConfig } from '@graphql-codegen/typescript'
import type { TypeScriptDocumentsPluginConfig } from '@graphql-codegen/typescript-operations'
import type { TypeScriptResolversPluginConfig } from '@graphql-codegen/typescript-resolvers'
import type { IResolvers } from '@graphql-tools/utils'
import type { YogaServerOptions } from 'graphql-yoga'
import type { ESMCodeGenOptions } from 'knitwork'
import type { IncomingMessage, ServerResponse } from 'node:http'

export type { StandardSchemaV1 } from './standard-schema'

export type CodegenServerConfig = TypeScriptPluginConfig & TypeScriptResolversPluginConfig

interface IESMImport {
  name: string
  as?: string
  type: 'resolver' | 'query' | 'mutation' | 'type'
}

export interface GenImport {
  specifier: string
  imports: IESMImport[]
  options?: ESMCodeGenOptions
}

declare module 'nitropack/types' {
  interface Nitro {
    scanDefs: string[]
    scanResolvers: GenImport[]
    graphql: {
      buildDir: string
      watchDirs: string[]
      clientDir: string
      serverDir: string
    }
  }
}

declare module 'nitropack' {
  interface NitroOptions {
    graphql?: NitroGraphQLOptions
  }

  interface NitroRuntimeConfig {
    graphql?: NitroGraphQLOptions
  }

  interface NitroConfig {
    graphql?: NitroGraphQLOptions
  }
}

export interface GraphQLSchemaConfig {
  typeDefs: string | string[]
  resolvers: any
}

export interface CodegenClientConfig extends TypeScriptPluginConfig, TypeScriptDocumentsPluginConfig {
  endpoint?: string
  documentMode?: 'string' | 'graphQLTag' | 'documentNode' | 'documentNodeImportFragments' | 'external'
}

export interface NitroGraphQLOptions {
  endpoint?: {
    graphql?: string
    healthCheck?: string
  }
  playground?: boolean
  cors?: YogaServerOptions<{ req: IncomingMessage, res: ServerResponse }, any>['cors']
  typedefs?: string[]
  resolvers?: Array<IResolvers<any, any>>
  loader?: {
    include?: RegExp
    exclude?: RegExp
    validate?: boolean
  }
  cacheHeaders?: {
    enabled?: boolean
    maxAge?: number
  }
  codegen?: {
    server?: CodegenServerConfig
    client?: CodegenClientConfig
  }
  client?: {
    enabled?: boolean
    outputPath?: string
    watchPatterns?: string[]
    nuxtPatterns?: string[]
  }
  yogaConfig?: Partial<YogaServerOptions<any, any>>
}

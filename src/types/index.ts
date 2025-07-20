import type { TypeScriptPluginConfig } from '@graphql-codegen/typescript'
import type { plugin as typescriptGenericSdk } from '@graphql-codegen/typescript-generic-sdk'
import type { TypeScriptDocumentsPluginConfig } from '@graphql-codegen/typescript-operations'
import type { TypeScriptResolversPluginConfig } from '@graphql-codegen/typescript-resolvers'
import type { IResolvers } from '@graphql-tools/utils'
import type { ESMCodeGenOptions } from 'knitwork'

export type { StandardSchemaV1 } from './standard-schema'

export type CodegenServerConfig = TypeScriptPluginConfig & TypeScriptResolversPluginConfig

// CODEGEN
type DocumentModeConfig = Pick<Parameters<typeof typescriptGenericSdk>[2], 'documentMode'>
type DocumentModeEnum = NonNullable<DocumentModeConfig['documentMode']>
type DocumentModeType = `${DocumentModeEnum}`

export type GenericSdkConfig = Omit<Parameters<typeof typescriptGenericSdk>[2], 'documentMode'> & {
  documentMode?: DocumentModeType
}

export type CodegenClientConfig = TypeScriptPluginConfig & TypeScriptDocumentsPluginConfig & {
  endpoint?: string
}

interface IESMImport {
  name: string
  as?: string
  type: 'resolver' | 'query' | 'mutation' | 'type' | 'subscription'
}

export interface GenImport {
  specifier: string
  imports: IESMImport[]
  options?: ESMCodeGenOptions
}

declare module 'nitropack/types' {
  interface Nitro {
    scanSchemas: string[]
    scanDocuments: string[]
    scanResolvers: GenImport[]
    graphql: {
      buildDir: string
      watchDirs: string[]
      clientDir: string
      serverDir: string
      dir: {
        build: string
        client: string
        server: string
      }
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

export interface NitroGraphQLOptions {
  framework: 'graphql-yoga' | 'apollo-server'
  endpoint?: {
    graphql?: string
    healthCheck?: string
  }
  playground?: boolean
  typedefs?: string[]
  resolvers?: Array<IResolvers<any, any>>
  loader?: {
    include?: RegExp
    exclude?: RegExp
    validate?: boolean
  }
  codegen?: {
    server?: CodegenServerConfig
    client?: CodegenClientConfig
    clientSDK?: GenericSdkConfig
  }
}

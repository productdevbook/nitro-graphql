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
  type: 'resolver' | 'query' | 'mutation' | 'type' | 'subscription' | 'directive'
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
    scanDirectives: GenImport[]
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

export interface ExternalGraphQLService {
  /** Unique name for this service (used for file naming and type generation) */
  name: string
  /** Schema source - can be URL(s) for remote schemas or file path(s) for local schemas */
  schema: string | string[]
  /** GraphQL endpoint for this service */
  endpoint: string
  /** Optional headers for schema introspection and client requests */
  headers?: Record<string, string> | (() => Record<string, string>)
  /** Optional: specific document patterns for this service */
  documents?: string[]
  /**
   * Optional: Download and cache schema locally for offline usage
   * - true or 'once': Download if file doesn't exist, then use cached version (offline-friendly)
   * - 'always': Check for updates on every build (current behavior)
   * - 'manual': Never download automatically, user manages schema files manually
   * - false: Disable schema downloading
   */
  downloadSchema?: boolean | 'once' | 'always' | 'manual'
  /** Optional: Custom path to save downloaded schema (default: .nitro/graphql/schemas/[serviceName].graphql) */
  downloadPath?: string
  /** Optional: service-specific codegen configuration */
  codegen?: {
    client?: CodegenClientConfig
    clientSDK?: GenericSdkConfig
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
  /** External GraphQL services to generate types and SDKs for */
  externalServices?: ExternalGraphQLService[]
  /** Server GraphQL directory path */
  serverDir?: string
  /** Layer directories (populated by Nuxt module) */
  layerDirectories?: string[]
  layerServerDirs?: string[]
  layerAppDirs?: string[]
}

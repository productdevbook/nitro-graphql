/**
 * Virtual module stubs for #nitro-graphql/*
 * Used during build to prevent import resolution errors.
 * At runtime, Nitro overrides these with actual virtual modules.
 */

import type { IResolvers } from '@graphql-tools/utils'

// #nitro-graphql/server-schemas
export const schemas: Array<{ def: string }> = []

// #nitro-graphql/server-resolvers
export const resolvers: Array<{ resolver: IResolvers }> = []

// #nitro-graphql/server-directives
export const directives: Array<{ directive: { name: string, locations: string[], transformer?: (schema: unknown) => unknown } }> = []

// #nitro-graphql/module-config
export const moduleConfig = {}

// #nitro-graphql/graphql-config
const importedConfig = {}
export { importedConfig }

// #nitro-graphql/debug-info
export interface DebugInfoStub {
  isDev: boolean
  framework: string
  graphqlFramework?: string
  federation?: Record<string, unknown>
  scanned: {
    schemas: number
    schemaFiles: string[]
    resolvers: number
    resolverFiles: Array<{ specifier: string, imports: Array<{ name: string, type: string, as?: string }> }>
    directives: number
    directiveFiles: Array<{ specifier: string, imports: Array<{ name: string, type: string, as?: string }> }>
    documents: number
    documentFiles: string[]
  }
  virtualModules: Record<string, string>
}

export const debugInfo: DebugInfoStub = {
  isDev: false,
  framework: '',
  graphqlFramework: '',
  federation: {},
  scanned: {
    schemas: 0,
    schemaFiles: [],
    resolvers: 0,
    resolverFiles: [],
    directives: 0,
    directiveFiles: [],
    documents: 0,
    documentFiles: [],
  },
  virtualModules: {},
}

// #nitro-graphql/pubsub
export const pubsub: null = null

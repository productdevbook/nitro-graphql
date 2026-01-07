/**
 * Virtual module stubs for #nitro-graphql/*
 * Used during build to prevent import resolution errors.
 * At runtime, Nitro overrides these with actual virtual modules.
 */

// #nitro-graphql/server-schemas
export const schemas: Array<{ def: string }> = []

// #nitro-graphql/server-resolvers
export const resolvers: Array<{ resolver: any }> = []

// #nitro-graphql/server-directives
export const directives: Array<{ directive: any }> = []

// #nitro-graphql/module-config
export const moduleConfig = {}

// #nitro-graphql/graphql-config
const importedConfig = {}
export { importedConfig }

// #nitro-graphql/debug-info
export const debugInfo: Record<string, any> = {
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
export const pubsub: any = null

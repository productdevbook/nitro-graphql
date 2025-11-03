/**
 * Virtual module stub for #nitro-graphql/debug-info
 * This file is only used during build/bundling to prevent import resolution errors.
 * At runtime, Nitro will override this with the actual virtual module.
 */

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

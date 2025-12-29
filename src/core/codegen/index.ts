/**
 * Codegen utilities barrel export
 * Framework-agnostic type generation utilities
 */

// Client codegen
export {
  DEFAULT_CLIENT_CODEGEN_CONFIG,
  downloadAndSaveSchema,
  generateClientTypesCore,
  generateExternalClientTypesCore,
  graphQLLoadSchemaSync,
  loadExternalSchema,
  loadGraphQLDocuments,
} from './client'

export type {
  GraphQLLoadSchemaOptions,
  GraphQLTypeDefPointer,
} from './client'

// Plugin
export * from './plugin'

// Server codegen
export {
  DEFAULT_SERVER_CODEGEN_CONFIG,
  generateServerTypesCore,
  generateTypes,
} from './server'
// Validation
export * from './validation'

// Runtime code generation
export {
  generateResolverModule,
  generateRuntimeIndex,
  generateSchemaModule,
} from './runtime'

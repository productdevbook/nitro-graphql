/**
 * Codegen utilities barrel export
 * Framework-agnostic type generation utilities
 */

// Client codegen
export {
  DEFAULT_CLIENT_CODEGEN_CONFIG,
  downloadAndSaveSchema,
  extractSubscriptions,
  generateClientTypesCore,
  generateExternalClientTypesCore,
  generateSubscriptionBuilder,
  graphQLLoadSchemaSync,
  loadExternalSchema,
  loadGraphQLDocuments,
} from './client'

export type {
  GraphQLLoadSchemaOptions,
  GraphQLTypeDefPointer,
  SubscriptionInfo,
} from './client'

// Plugin
export * from './plugin'

// Runtime code generation
export {
  generateResolverModule,
  generateRuntimeIndex,
  generateSchemaModule,
} from './runtime'
// Server codegen
export {
  DEFAULT_SERVER_CODEGEN_CONFIG,
  generateServerTypesCore,
  generateTypes,
} from './server'

// Validation
export * from './validation'

/**
 * Codegen utilities barrel export
 * Framework-agnostic type generation utilities
 */

// Client codegen (framework-agnostic pipeline)
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

// Subscription utilities (split by concern)
export { extractSubscriptions } from './subscription-extractor'
export type { SubscriptionInfo } from './subscription-extractor'
export { generateSubscriptionBuilder } from './vue-subscription-builder'

// Plugin
export * from './plugin'
export { typedDocumentStringPlugin } from './plugins/typed-document-string'

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

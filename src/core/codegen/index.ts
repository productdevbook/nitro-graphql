/**
 * Codegen utilities barrel export
 * Framework-agnostic type generation utilities
 */

// Client codegen
export {
  DEFAULT_CLIENT_CODEGEN_CONFIG,
  generateClientTypesCore,
  generateExternalClientTypesCore,
} from './client'

// Document loading
export { loadGraphQLDocuments } from './document-loader'

// File header
export { GENERATED_FILE_HEADER, pluginContent } from './file-header'

// Runtime code generation
export {
  generateResolverModule,
  generateRuntimeIndex,
  generateSchemaModule,
} from './runtime-generator'

// Schema loading
export { downloadAndSaveSchema, graphQLLoadSchemaSync, loadExternalSchema } from './schema-loader'
export type { GraphQLLoadSchemaOptions, GraphQLTypeDefPointer } from './schema-loader'

// Server codegen
export {
  DEFAULT_SERVER_CODEGEN_CONFIG,
  generateServerTypesCore,
} from './server'

// Subscription utilities
export { extractSubscriptions } from './subscription-extractor'
export type { SubscriptionInfo } from './subscription-extractor'
// Custom codegen plugins
export { typedDocumentStringPlugin } from './typed-document-string'

// Validation
export { validateNoDuplicateTypes, validateSchemaFiles } from './validation'

export { generateSubscriptionBuilder } from './vue-subscription-builder'

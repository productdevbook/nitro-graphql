/**
 * Lightweight runtime-only core exports
 *
 * This module exports only runtime functionality without codegen dependencies.
 * Use this for environments that don't need type generation (like Vercube runtime).
 *
 * Excludes:
 * - @graphql-codegen/* packages
 * - graphql-config
 * - parse-filepath
 * - Other Node.js-only build-time dependencies
 */

// Config defaults
export { DEFAULT_GRAPHQL_SCALARS } from './constants'

// Scanning utilities (file scanning)
export {
  scanDirectivesCore,
  scanResolversCore,
  scanSchemasCore,
} from './scanning'
export { scanDocumentsCore as scanDocsCore } from './scanning/documents'

// Schema utilities (lightweight, no codegen)
export { buildGraphQLSchema } from './schema/builder'

export type { ResolverDefinition, SchemaDefinition } from './schema/builder'

// Server factories (GraphQL Yoga, sandbox)
export {
  createSandboxResponse,
  createYogaServer,
} from './server'
export type { CoreSecurityConfig, CoreServerInstance } from './server'

// Types from scanning
export type { ScanContext } from './types/scanning'
// Logger utilities
export { createSilentLogger } from './utils/logger'

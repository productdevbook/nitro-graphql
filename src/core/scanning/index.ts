/**
 * Core scanning module barrel export
 * Framework-agnostic file scanning utilities
 */

// Common utilities
export {
  deduplicateFiles,
  extractPaths,
  filterByExtension,
  scanDirectory,
} from './common'

// Directive scanning
export {
  scanDirectiveFilesCore,
  scanDirectivesCore,
} from './directives'

// Document scanning
export {
  scanDocumentsCore,
  scanExternalServiceDocsCore,
} from './documents'

export type { ScanDocumentsOptions } from './documents'

// Resolver scanning
export {
  scanResolversCore,
} from './resolvers'
// Schema scanning
export {
  scanGraphqlCore,
  scanSchemasCore,
} from './schemas'

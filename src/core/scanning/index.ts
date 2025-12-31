/**
 * Core scanning module barrel export
 * Framework-agnostic file scanning utilities
 */

// AST-based scanning
export { scanWithAST } from './ast-scanner'
export type { ASTScanConfig } from './ast-scanner'

// Common utilities
export {
  deduplicateFiles,
  extractPaths,
  filterByExtension,
  scanDirectory,
} from './common'

// Directive scanning
export { scanDirectivesCore } from './directives'

// Document scanning
export { scanDocumentsCore } from './documents'

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

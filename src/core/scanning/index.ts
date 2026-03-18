/**
 * Core scanning module barrel export
 * Framework-agnostic file scanning utilities
 */

// AST-based scanning
export { parseSingleFile, scanWithAST } from './ast-scanner'
export type { ASTScanConfig } from './ast-scanner'

// Directive scanning
export { parseDirectiveCall, scanDirectivesCore } from './directives'

// Document scanning
export { scanDocumentsCore } from './documents'

export type { ScanDocumentsOptions } from './documents'

// File scanning utilities
export {
  deduplicateFiles,
  extractPaths,
  filterByExtension,
  scanDirectory,
} from './file-scanner'

// Resolver scanning
export {
  parseResolverCall,
  scanResolversCore,
} from './resolvers'
// Schema scanning
export {
  scanSchemasCore,
} from './schemas'

/**
 * Utility functions barrel export
 * Re-exports from submodules for backwards compatibility
 */

// Directive parser utilities
export { directiveParser, generateDirectiveSchema, generateDirectiveSchemas } from './directive-parser'

// Error handling utilities
export { createDefaultMaskError } from './errors'

// Federation utilities
export { loadFederationSupport, resetFederationCache, warnFederationUnavailable } from './federation'

// Import utilities
export { getImportId, relativeWithDot } from './imports'

// Layer utilities
export {
  generateLayerIgnorePatterns,
  getLayerAppDirectories,
  getLayerDirectories,
  getLayerServerDirectories,
} from './layers'

// Scanning utilities
export {
  deduplicateFiles,
  scanDir,
  scanDirectives,
  scanDocuments,
  scanExternalServiceDocs,
  scanGraphql,
  scanResolvers,
  scanSchemas,
} from './scanning'
export type { FileInfo } from './scanning'

// Validation utilities
export { validateExternalServices } from './validation'

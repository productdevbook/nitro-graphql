/**
 * @deprecated This file is now a compatibility wrapper
 * Import from '../codegen' instead for the new modular structure
 *
 * This wrapper maintains backwards compatibility while we transition to the new structure
 */

// Re-export everything from the new modular codegen structure
export {
  clientTypeGeneration,
  generateExternalServicesTypes,
  generateMainClientTypes,
  generateServerTypes,
  serverTypeGeneration,
  validateNoDuplicateTypes,
} from '../codegen'

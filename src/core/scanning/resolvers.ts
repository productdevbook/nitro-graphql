/**
 * Resolver scanning utilities
 * Framework-agnostic resolver file scanning and parsing
 */

import type { ResolverImport, ScanContext, ScannedResolver, ScanResult } from '../types/scanning'
import { DEFINE_FUNCTIONS, RESOLVER_GLOB_PATTERN } from '../constants'
import { getImportId } from '../utils/imports'
import { scanWithAST } from './ast-scanner'

/**
 * Parse a define* function call and return the import info
 * Exported for use by manifest loader
 */
export function parseResolverCall(
  calleeName: string,
  exportName: string,
  filePath: string,
): ResolverImport | null {
  const alias = getImportId(exportName + filePath)

  switch (calleeName) {
    case 'defineResolver':
      return { name: exportName, type: 'resolver', as: alias }
    case 'defineQuery':
      return { name: exportName, type: 'query', as: alias }
    case 'defineMutation':
      return { name: exportName, type: 'mutation', as: alias }
    case 'defineField':
      return { name: exportName, type: 'type', as: alias }
    case 'defineSubscription':
      return { name: exportName, type: 'subscription', as: alias }
    case 'defineDirective':
      return { name: exportName, type: 'directive', as: alias }
    default:
      return null
  }
}

/**
 * Scan for resolver files and parse their exports
 */
export function scanResolversCore(ctx: ScanContext): Promise<ScanResult<ScannedResolver>> {
  return scanWithAST(ctx, {
    pattern: RESOLVER_GLOB_PATTERN,
    parseCall: parseResolverCall,
    emitWarnings: true,
    validFunctions: DEFINE_FUNCTIONS,
  })
}

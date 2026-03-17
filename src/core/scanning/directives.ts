/**
 * Directive scanning utilities
 * Framework-agnostic directive file scanning and parsing
 */

import type { ResolverImport, ScanContext, ScannedResolver, ScanResult } from '../types/scanning'
import { DIRECTIVE_GLOB_PATTERN } from '../constants'
import { getImportId } from '../utils/imports'
import { scanWithAST } from './ast-scanner'

/**
 * Parse a defineDirective call and return the import info
 */
export function parseDirectiveCall(
  calleeName: string,
  exportName: string,
  filePath: string,
): ResolverImport | null {
  if (calleeName !== 'defineDirective') {
    return null
  }

  return {
    name: exportName,
    type: 'directive',
    as: getImportId(exportName + filePath),
  }
}

/**
 * Scan for directive files (.directive.ts/.js)
 */
export function scanDirectivesCore(ctx: ScanContext): Promise<ScanResult<ScannedResolver>> {
  return scanWithAST(ctx, {
    pattern: DIRECTIVE_GLOB_PATTERN,
    parseCall: parseDirectiveCall,
    emitWarnings: false,
  })
}

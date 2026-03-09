/**
 * Directive scanning utilities
 * Framework-agnostic directive file scanning and parsing
 */

import type { ResolverImport, ScanContext, ScannedResolver, ScanResult } from '../types/scanning'
import { hash } from 'ohash'
import { DIRECTIVE_GLOB_PATTERN } from '../constants'
import { scanWithAST } from './ast-scanner'

const HYPHEN_RE = /-/g

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
    as: `_${hash(exportName + filePath).replace(HYPHEN_RE, '').slice(0, 6)}`,
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

/**
 * Import utilities
 * Helpers for generating import IDs and relative paths
 */

import { hash } from 'ohash'
import { relative } from 'pathe'

/**
 * Generate a unique import ID for a file path
 */
export function getImportId(p: string, lazy?: boolean): string {
  return (lazy ? '_lazy_' : '_') + hash(p).replace(/-/g, '').slice(0, 6)
}

const RELATIVE_RE = /^\.{1,2}\//

/**
 * Get relative path with a leading dot for module resolution
 */
export function relativeWithDot(from: string, to: string): string {
  const rel = relative(from, to)
  return RELATIVE_RE.test(rel) ? rel : `./${rel}`
}

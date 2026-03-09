/**
 * Document scanning utilities
 * Framework-agnostic GraphQL client document scanning
 */

import type { CoreExternalService } from '../types/config'
import type { ScanContext, ScanResult } from '../types/scanning'
import { relative } from 'pathe'
import { GRAPHQL_GLOB_PATTERN } from '../constants'
import { scanDirectory } from './common'

const REGEX_SPECIAL_CHARS_RE = /[.*+?^${}()|[\]\\]/g

/**
 * Options for scanning documents
 */
export interface ScanDocumentsOptions {
  /** External services to exclude from main scan */
  externalServices?: CoreExternalService[]
  /** Client directory relative path */
  clientDirRelative?: string
}

/**
 * Scan for GraphQL client documents (.graphql, .gql) in client directory
 * Excludes files from external service directories
 */
export async function scanDocumentsCore(
  ctx: ScanContext,
  options: ScanDocumentsOptions = {},
): Promise<ScanResult<string>> {
  const warnings: string[] = []
  const errors: string[] = []

  try {
    const clientDirRelative = options.clientDirRelative || relative(ctx.rootDir, ctx.clientDir)

    // Scan main project documents
    const allFiles = await scanDirectory(ctx, ctx.rootDir, clientDirRelative, GRAPHQL_GLOB_PATTERN)

    // Get external service document patterns to filter out
    const externalServices = options.externalServices || []
    const externalPatterns = externalServices.flatMap(service => service.documents || [])

    // Filter out files in the external directory and files matching external service patterns
    const filteredPaths = allFiles
      .filter(f => !f.path.startsWith('external/'))
      .filter((f) => {
        const relativePath = f.path

        for (const pattern of externalPatterns) {
          // Extract directory name from pattern for matching
          const cleanPattern = pattern.replace(new RegExp(`^${clientDirRelative.replace(REGEX_SPECIAL_CHARS_RE, '\\$&')}/`), '')
          const patternDir = cleanPattern.split('/')[0]
          const fileDir = relativePath.split('/')[0]

          // If the file is in a directory that's part of an external service pattern, exclude it
          if (patternDir === fileDir) {
            return false
          }
        }

        return true
      })
      .map(f => f.fullPath)

    return { items: filteredPaths, warnings, errors }
  }
  catch (error) {
    errors.push(`Document scanning error: ${error}`)
    return { items: [], warnings, errors }
  }
}

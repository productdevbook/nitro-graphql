/**
 * Schema scanning utilities
 * Framework-agnostic GraphQL schema file scanning
 */

import type { ScanContext, ScanResult } from '../types/scanning'
import { relative } from 'pathe'
import { GRAPHQL_GLOB_PATTERN } from '../constants'
import { deduplicateFiles, extractPaths, scanDirectory } from './common'

/**
 * Scan for GraphQL schema files (.graphql) in server directory
 */
export async function scanSchemasCore(ctx: ScanContext): Promise<ScanResult<string>> {
  const warnings: string[] = []
  const errors: string[] = []

  try {
    // Scan from serverDir
    const serverDirRelative = relative(ctx.rootDir, ctx.serverDir)
    const files = await scanDirectory(ctx, ctx.rootDir, serverDirRelative, GRAPHQL_GLOB_PATTERN)

    // Also scan layer directories
    const layerFiles = await Promise.all(
      (ctx.layerServerDirs || []).map(layerServerDir =>
        scanDirectory(ctx, layerServerDir, 'graphql', GRAPHQL_GLOB_PATTERN),
      ),
    ).then(r => r.flat())

    // Combine and deduplicate
    const allFiles = deduplicateFiles([...files, ...layerFiles])
    const paths = extractPaths(allFiles)

    return { items: paths, warnings, errors }
  }
  catch (error) {
    errors.push(`Schema scanning error: ${error}`)
    return { items: [], warnings, errors }
  }
}

/**
 * Scan for GraphQL files (.graphql, .gql) in server directory
 */
export async function scanGraphqlCore(ctx: ScanContext): Promise<ScanResult<string>> {
  const warnings: string[] = []
  const errors: string[] = []

  try {
    // Scan from serverDir
    const serverDirRelative = relative(ctx.rootDir, ctx.serverDir)
    const files = await scanDirectory(ctx, ctx.rootDir, serverDirRelative, '**/*.{graphql,gql}')

    // Also scan layer directories
    const layerFiles = await Promise.all(
      (ctx.layerServerDirs || []).map(layerServerDir =>
        scanDirectory(ctx, layerServerDir, 'graphql', '**/*.{graphql,gql}'),
      ),
    ).then(r => r.flat())

    // Combine and deduplicate
    const allFiles = deduplicateFiles([...files, ...layerFiles])
    const paths = extractPaths(allFiles)

    return { items: paths, warnings, errors }
  }
  catch (error) {
    errors.push(`GraphQL scanning error: ${error}`)
    return { items: [], warnings, errors }
  }
}

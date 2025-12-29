/**
 * Schema scanning utilities
 * Framework-agnostic GraphQL schema file scanning
 */

import type { ScanContext, ScanResult } from '../types/scanning'
import { relative } from 'pathe'
import { GRAPHQL_GLOB_PATTERN } from '../constants'
import { extractPaths, scanWithLayers } from './common'

/**
 * Scan for GraphQL schema files (.graphql) in server directory
 */
export async function scanSchemasCore(ctx: ScanContext): Promise<ScanResult<string>> {
  const warnings: string[] = []
  const errors: string[] = []

  try {
    const serverDirRelative = relative(ctx.rootDir, ctx.serverDir)
    const files = await scanWithLayers(ctx, {
      mainDir: ctx.rootDir,
      mainSubDir: serverDirRelative,
      layerDirs: ctx.layerServerDirs,
      layerSubDir: 'graphql',
      pattern: GRAPHQL_GLOB_PATTERN,
    })
    const paths = extractPaths(files)

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
    const serverDirRelative = relative(ctx.rootDir, ctx.serverDir)
    const files = await scanWithLayers(ctx, {
      mainDir: ctx.rootDir,
      mainSubDir: serverDirRelative,
      layerDirs: ctx.layerServerDirs,
      layerSubDir: 'graphql',
      pattern: '**/*.{graphql,gql}',
    })
    const paths = extractPaths(files)

    return { items: paths, warnings, errors }
  }
  catch (error) {
    errors.push(`GraphQL scanning error: ${error}`)
    return { items: [], warnings, errors }
  }
}

/**
 * Schema scanning utilities
 * Scans for GraphQL schema files (.graphql)
 */

import type { Nitro } from 'nitro/types'
import { relative } from 'pathe'
import { getLayerServerDirectories } from '../layers'
import { deduplicateFiles, scanDir } from './common'

/**
 * Scan for GraphQL schema files (.graphql) in server directory
 */
export async function scanSchemas(nitro: Nitro): Promise<string[]> {
  // Scan from serverDir
  const serverDirRelative = relative(nitro.options.rootDir, nitro.graphql.serverDir)
  const files = await scanDir(nitro, nitro.options.rootDir, serverDirRelative, '**/*.graphql')

  // Also scan layer directories for Nuxt projects
  const layerServerDirs = getLayerServerDirectories(nitro)
  const layerFiles = await Promise.all(
    layerServerDirs.map(layerServerDir =>
      scanDir(nitro, layerServerDir, 'graphql', '**/*.graphql'),
    ),
  ).then(r => r.flat())

  // Combine and deduplicate
  const allFiles = deduplicateFiles([...files, ...layerFiles])
  return allFiles.map(f => f.fullPath)
}

/**
 * Scan for GraphQL files (.graphql, .gql) in server directory
 * Similar to scanSchemas but includes .gql extension
 */
export async function scanGraphql(nitro: Nitro): Promise<string[]> {
  // Scan from serverDir (same logic as scanSchemas)
  const serverDirRelative = relative(nitro.options.rootDir, nitro.graphql.serverDir)
  const files = await scanDir(nitro, nitro.options.rootDir, serverDirRelative, '**/*.{graphql,gql}')

  // Also scan layer directories for Nuxt projects
  const layerServerDirs = getLayerServerDirectories(nitro)
  const layerFiles = await Promise.all(
    layerServerDirs.map(layerServerDir =>
      scanDir(nitro, layerServerDir, 'graphql', '**/*.{graphql,gql}'),
    ),
  ).then(r => r.flat())

  // Combine and deduplicate
  const allFiles = deduplicateFiles([...files, ...layerFiles])
  return allFiles.map(f => f.fullPath)
}

/**
 * Document scanning utilities
 * Scans for GraphQL client documents (.graphql)
 */

import type { Nitro } from 'nitro/types'
import { glob } from 'tinyglobby'
import { getLayerAppDirectories } from '../layers'
import { deduplicateFiles, scanDir } from './common'

/**
 * Scan for GraphQL client documents (.graphql) in client directory
 * Excludes files from external service directories
 */
export async function scanDocuments(nitro: Nitro): Promise<string[]> {
  // Scan main project documents
  const files = await scanDir(nitro, nitro.options.rootDir, nitro.graphql.dir.client, '**/*.graphql')

  // Scan layer documents for Nuxt projects
  const layerAppDirs = getLayerAppDirectories(nitro)
  const layerFiles = await Promise.all(
    layerAppDirs.map(layerAppDir => scanDir(nitro, layerAppDir, 'graphql', '**/*.graphql')),
  ).then(r => r.flat())

  // Combine and deduplicate
  const allFiles = deduplicateFiles([...files, ...layerFiles])

  // Get external service document patterns to filter out
  const externalServices = nitro.options.graphql?.externalServices || []
  const externalPatterns = externalServices.flatMap(service => service.documents || [])

  // Filter out files in the external directory and files matching external service patterns
  return allFiles
    .filter(f => !f.path.startsWith('external/'))
    .filter((f) => {
      // Check if this file matches any external service document patterns
      const relativePath = f.path

      for (const pattern of externalPatterns) {
        // Remove the leading client directory path from patterns to match relative paths
        // This handles both 'app/graphql/' and custom client directory patterns
        const clientDirPattern = `${nitro.graphql.dir.client}/`
        const cleanPattern = pattern.replace(new RegExp(`^${clientDirPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), '')

        // Extract directory name from pattern for matching
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
}

/**
 * Scan documents for a specific external service
 */
export async function scanExternalServiceDocs(nitro: Nitro, serviceName: string, patterns: string[]): Promise<string[]> {
  if (!patterns.length) {
    return []
  }

  const files: string[] = []

  for (const pattern of patterns) {
    try {
      const serviceFiles = await glob(pattern, {
        cwd: nitro.options.rootDir,
        dot: true,
        ignore: nitro.options.ignore,
        absolute: true,
      })
      files.push(...serviceFiles)
    }
    catch (error) {
      nitro.logger.warn(`[graphql:${serviceName}] Error scanning documents with pattern "${pattern}":`, error)
    }
  }

  // Remove duplicates
  return files.filter((file, index, self) => self.indexOf(file) === index)
}

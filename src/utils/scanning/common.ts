/**
 * Common scanning utilities
 * Shared functions for file scanning operations
 */

import type { Nitro } from 'nitro/types'
import { join, relative } from 'pathe'
import { glob } from 'tinyglobby'
import { GLOB_SCAN_PATTERN } from '../../constants'

/**
 * File information returned from scanning operations
 */
export interface FileInfo {
  path: string
  fullPath: string
}

/**
 * Scan a directory for files matching a glob pattern
 */
export async function scanDir(
  nitro: Nitro,
  dir: string,
  name: string,
  globPattern: string = GLOB_SCAN_PATTERN,
): Promise<FileInfo[]> {
  const fileNames = await glob(join(name, globPattern), {
    cwd: dir,
    dot: true,
    ignore: nitro.options.ignore,
    absolute: true,
  }).catch((error) => {
    if (error?.code === 'ENOTDIR') {
      nitro.logger.warn(
        `Ignoring \`${join(dir, name)}\`. It must be a directory.`,
      )
      return []
    }
    throw error
  })

  return fileNames
    .map(fullPath => ({
      fullPath,
      path: relative(join(dir, name), fullPath),
    }))
    .sort((a, b) => a.path.localeCompare(b.path))
}

/**
 * Deduplicate files by fullPath
 */
export function deduplicateFiles<T extends { fullPath: string }>(files: T[]): T[] {
  const seenPaths = new Set<string>()
  return files.filter((file) => {
    if (seenPaths.has(file.fullPath)) {
      return false
    }
    seenPaths.add(file.fullPath)
    return true
  })
}

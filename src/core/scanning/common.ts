/**
 * Common scanning utilities
 * Framework-agnostic file scanning operations
 */

import type { ScanContext, ScannedFile } from '../types/scanning'
import { join, relative } from 'pathe'
import { glob } from 'tinyglobby'
import { GLOB_SCAN_PATTERN } from '../constants'

// Default patterns to always ignore during scanning
const DEFAULT_IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.output/**',
  '**/.nitro/**',
  '**/.nuxt/**',
  '**/.graphql/**',
]

/**
 * Scan a directory for files matching a glob pattern
 */
export async function scanDirectory(
  ctx: ScanContext,
  baseDir: string,
  subDir: string,
  globPattern: string = GLOB_SCAN_PATTERN,
): Promise<ScannedFile[]> {
  const fileNames = await glob(join(subDir, globPattern), {
    cwd: baseDir,
    dot: true,
    ignore: [...DEFAULT_IGNORE_PATTERNS, ...ctx.ignorePatterns],
    absolute: true,
  }).catch((error) => {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOTDIR') {
      ctx.logger.warn(`Ignoring \`${join(baseDir, subDir)}\`. It must be a directory.`)
      return []
    }
    throw error
  })

  return fileNames
    .map(fullPath => ({
      fullPath,
      path: relative(join(baseDir, subDir), fullPath),
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

/**
 * Filter files by extension
 */
export function filterByExtension<T extends { fullPath: string }>(
  files: T[],
  extensions: readonly string[],
): T[] {
  return files.filter(file =>
    extensions.some(ext => file.fullPath.endsWith(ext)),
  )
}

/**
 * Extract file paths from scanned files
 */
export function extractPaths(files: ScannedFile[]): string[] {
  return files.map(f => f.fullPath)
}

/**
 * Scan directory with layer support
 * Encapsulates the common pattern of scanning main directory + layer directories
 */
export async function scanWithLayers(
  ctx: ScanContext,
  options: {
    mainDir: string
    mainSubDir: string
    layerDirs: string[] | undefined
    layerSubDir: string
    pattern: string
  },
): Promise<ScannedFile[]> {
  // Scan main directory
  const mainFiles = await scanDirectory(ctx, options.mainDir, options.mainSubDir, options.pattern)

  // Scan layer directories
  const layerFiles = await Promise.all(
    (options.layerDirs || []).map(layerDir =>
      scanDirectory(ctx, layerDir, options.layerSubDir, options.pattern),
    ),
  ).then(r => r.flat())

  // Combine, deduplicate, and sort for deterministic output
  const combined = deduplicateFiles([...mainFiles, ...layerFiles])
  return combined.sort((a, b) => a.path.localeCompare(b.path))
}

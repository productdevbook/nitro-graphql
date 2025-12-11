/**
 * File writer utilities
 * Generic utilities for writing generated files
 */

import type { PathPlaceholders } from './path-resolver'
import { mkdirSync, writeFileSync } from 'node:fs'
import consola from 'consola'
import { dirname } from 'pathe'
import { LOG_TAG } from '../constants'
import { resolveFilePath } from './path-resolver'

const logger = consola.withTag(LOG_TAG)

/**
 * Options for writing generated files
 */
export interface WriteGeneratedFileOptions {
  /** Path configuration (string path, boolean, or undefined) */
  pathConfig: string | boolean | undefined
  /** Whether the category is enabled */
  categoryEnabled: boolean | undefined
  /** Default path template with placeholders */
  defaultPath: string
  /** Content to write */
  content: string
  /** Path placeholders for resolution */
  placeholders: PathPlaceholders
  /** Description for logging (e.g., "client types", "SDK") */
  description: string
  /** Whether to suppress success logs */
  silent?: boolean
}

/**
 * Write a generated file with path resolution and directory creation
 * Returns the resolved path if file was written, undefined otherwise
 */
export function writeGeneratedFile(options: WriteGeneratedFileOptions): string | undefined {
  const {
    pathConfig,
    categoryEnabled,
    defaultPath,
    content,
    placeholders,
    description,
    silent = false,
  } = options

  const resolvedPath = resolveFilePath(
    pathConfig,
    categoryEnabled,
    true,
    defaultPath,
    placeholders,
  )

  if (resolvedPath) {
    mkdirSync(dirname(resolvedPath), { recursive: true })
    writeFileSync(resolvedPath, content, 'utf-8')
    if (!silent) {
      logger.success(`Generated ${description} at: ${resolvedPath}`)
    }
    return resolvedPath
  }

  return undefined
}

/**
 * Write multiple generated files
 * Returns array of resolved paths for files that were written
 */
export function writeGeneratedFiles(
  files: WriteGeneratedFileOptions[],
): (string | undefined)[] {
  return files.map(file => writeGeneratedFile(file))
}

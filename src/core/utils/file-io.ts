/**
 * Unified file I/O utilities
 * Centralizes file writing patterns used across the codebase
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'pathe'

/**
 * Write file with automatic directory creation
 */
export function writeFile(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content, 'utf-8')
}

/**
 * Write file only if content changed (for dev mode optimization)
 * Returns true if file was written, false if unchanged
 */
export function writeFileIfChanged(path: string, content: string): boolean {
  try {
    if (existsSync(path)) {
      const existing = readFileSync(path, 'utf-8')
      if (existing === content) {
        return false
      }
    }
  }
  catch {
    // File doesn't exist or can't be read, write it
  }
  writeFile(path, content)
  return true
}

/**
 * Ensure directory exists
 */
export function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true })
}

/**
 * Read file safely, returns undefined if file doesn't exist
 */
export function readFileSafe(path: string): string | undefined {
  try {
    return readFileSync(path, 'utf-8')
  }
  catch {
    return undefined
  }
}

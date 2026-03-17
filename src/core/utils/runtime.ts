/**
 * Cross-runtime compatibility layer
 *
 * Provides runtime-agnostic file system and process utilities
 * that work across Node.js, Bun, and Deno.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL as nodePathToFileURL } from 'node:url'

// Type-safe Deno detection
const _globalThis = globalThis as typeof globalThis & { Deno?: { cwd: () => string, exit: (code: number) => never, addSignalListener: (signal: string, handler: () => void) => void } }

/**
 * Read file contents synchronously
 */
export function readFileSync_(path: string): string {
  return readFileSync(path, 'utf-8')
}

/**
 * Write file contents synchronously
 */
export function writeFileSync_(path: string, content: string): void {
  writeFileSync(path, content, 'utf-8')
}

/**
 * Check if file/directory exists synchronously
 */
export function existsSync_(path: string): boolean {
  return existsSync(path)
}

/**
 * Create directory recursively synchronously
 */
export function mkdirSync_(path: string): void {
  mkdirSync(path, { recursive: true })
}

/**
 * Get current working directory
 * Works across Node.js, Bun, and Deno
 */
export function getCwd(): string {
  if (_globalThis.Deno) {
    return _globalThis.Deno.cwd()
  }
  return process.cwd()
}

/**
 * Exit process with code
 * Works across Node.js, Bun, and Deno
 */
export function exit(code: number): never {
  if (_globalThis.Deno) {
    _globalThis.Deno.exit(code)
  }
  process.exit(code)
}

/**
 * Convert file path to file URL
 * Works across Node.js, Bun, and Deno
 */
export function pathToFileURL(path: string): URL {
  return nodePathToFileURL(path)
}

/**
 * Register signal handler (SIGINT, SIGTERM, etc.)
 * Works across Node.js, Bun, and Deno
 */
export function onSignal(signal: 'SIGINT' | 'SIGTERM', handler: () => void): void {
  if (_globalThis.Deno) {
    _globalThis.Deno.addSignalListener(signal, handler)
  }
  else {
    process.on(signal, handler)
  }
}

/**
 * Cross-runtime compatibility layer
 *
 * Provides runtime-agnostic file system and process utilities
 * that work across Node.js, Bun, and Deno.
 */

import { existsSync, promises as fsPromises, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL as nodePathToFileURL } from 'node:url'

// Type-safe Deno detection
const _globalThis = globalThis as typeof globalThis & { Deno?: { cwd: () => string, exit: (code: number) => never, addSignalListener: (signal: string, handler: () => void) => void } }

/**
 * Read file contents asynchronously
 */
export async function readFile(path: string): Promise<string> {
  return fsPromises.readFile(path, 'utf-8')
}

/**
 * Read file contents synchronously
 */
export function readFileSync_(path: string): string {
  return readFileSync(path, 'utf-8')
}

/**
 * Write file contents asynchronously
 */
export async function writeFile(path: string, content: string): Promise<void> {
  await fsPromises.writeFile(path, content, 'utf-8')
}

/**
 * Write file contents synchronously
 */
export function writeFileSync_(path: string, content: string): void {
  writeFileSync(path, content, 'utf-8')
}

/**
 * Check if file/directory exists asynchronously
 */
export async function exists(path: string): Promise<boolean> {
  try {
    await fsPromises.access(path)
    return true
  }
  catch {
    return false
  }
}

/**
 * Check if file/directory exists synchronously
 */
export function existsSync_(path: string): boolean {
  return existsSync(path)
}

/**
 * Create directory recursively asynchronously
 */
export async function mkdir(path: string): Promise<void> {
  await fsPromises.mkdir(path, { recursive: true })
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
  // Deno uses Deno.cwd(), Node/Bun use process.cwd()
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
  // Deno uses Deno.exit(), Node/Bun use process.exit()
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
    // Deno signal handling
    _globalThis.Deno.addSignalListener(signal, handler)
  }
  else {
    // Node.js/Bun signal handling
    process.on(signal, handler)
  }
}

/**
 * Read directory contents
 */
export async function readdir(path: string): Promise<string[]> {
  return fsPromises.readdir(path)
}

/**
 * Get file/directory stats
 */
export async function stat(path: string): Promise<{ isDirectory: () => boolean, isFile: () => boolean }> {
  return fsPromises.stat(path)
}

// Re-export for convenience
export { basename, dirname, join, resolve } from 'pathe'

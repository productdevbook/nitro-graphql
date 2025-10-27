import type { Nitro } from 'nitropack/types'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import consola from 'consola'
import { dirname } from 'pathe'

/**
 * Safely write a file to disk, creating parent directories if needed
 */
export function writeFile(filePath: string, content: string, description?: string): void {
  try {
    // Create parent directory if it doesn't exist
    const dir = dirname(filePath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    writeFileSync(filePath, content, 'utf-8')

    if (description) {
      consola.success(`[nitro-graphql] Generated: ${description}`)
    }
  }
  catch (error) {
    consola.error(`[nitro-graphql] Failed to write file: ${filePath}`, error)
    throw error
  }
}

/**
 * Write a file only if it doesn't already exist
 * Returns true if file was created, false if it already existed
 */
export function writeFileIfNotExists(
  filePath: string,
  content: string,
  description?: string,
): boolean {
  if (existsSync(filePath)) {
    return false
  }

  writeFile(filePath, content, description)
  return true
}

/**
 * Write a file and always overwrite (used for generated files like SDK)
 * This is for files that are auto-generated and should be updated on every build
 */
export function writeGeneratedFile(
  filePath: string,
  content: string,
  description?: string,
): void {
  writeFile(filePath, content, description)
}

/**
 * Check if a path is configured and should be generated
 * Returns the resolved path if should generate, null otherwise
 */
export function getGenerationPath(
  resolvedPath: string | null,
  description?: string,
): string | null {
  if (!resolvedPath) {
    if (description) {
      consola.debug(`[nitro-graphql] Skipping generation: ${description} (disabled in config)`)
    }
    return null
  }

  return resolvedPath
}

/**
 * Log skipped file generation (helpful for debugging library mode)
 */
export function logSkipped(fileName: string, reason?: string): void {
  const message = reason
    ? `Skipped ${fileName}: ${reason}`
    : `Skipped ${fileName}`
  consola.debug(`[nitro-graphql] ${message}`)
}

/**
 * Log generated file path
 */
export function logGenerated(fileName: string, path: string): void {
  consola.info(`[nitro-graphql] Generated ${fileName} at: ${path}`)
}

/**
 * Validate that a Nitro instance has the required GraphQL configuration
 */
export function validateGraphQLConfig(nitro: Nitro): boolean {
  if (!nitro.options.graphql?.framework) {
    consola.warn('[nitro-graphql] No GraphQL framework specified. Some features may not work correctly.')
    return false
  }

  return true
}

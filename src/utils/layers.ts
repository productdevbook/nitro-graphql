/**
 * Nuxt layer utilities
 * Handles layer directory discovery for multi-layer Nuxt projects
 */

import type { Nitro } from 'nitro/types'

/**
 * Get all Nuxt layer directories from Nitro config
 */
export function getLayerDirectories(nitro: Nitro): string[] {
  // Get layer directories that were passed from Nuxt module
  return nitro.options.graphql?.layerDirectories || []
}

/**
 * Get all Nuxt layer server directories from Nitro config
 */
export function getLayerServerDirectories(nitro: Nitro): string[] {
  // Get layer server directories that were passed from Nuxt module
  return nitro.options.graphql?.layerServerDirs || []
}

/**
 * Get all Nuxt layer app directories from Nitro config
 */
export function getLayerAppDirectories(nitro: Nitro): string[] {
  // Get layer app directories that were passed from Nuxt module
  return nitro.options.graphql?.layerAppDirs || []
}

/**
 * Generate layer-aware ignore patterns for auto-generated files
 */
export function generateLayerIgnorePatterns(): string[] {
  const patterns: string[] = []

  // _directives.graphql is now written to buildDir, so no longer needs to be ignored
  // buildDir is already ignored by Nitro by default

  return patterns
}

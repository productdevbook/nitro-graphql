/**
 * nitro-graphql Core
 *
 * Framework-agnostic core functionality for GraphQL code generation,
 * schema building, scanning, and utilities.
 *
 * This module contains no Nitro/Nuxt dependencies and can be used
 * standalone via CLI or integrated with any framework.
 */

// Codegen utilities
export * from './codegen'

// Configuration (flattened from config/)
export * from './config'

// Constants (flattened from constants/)
export * from './constants'

// Manifest utilities
export * from './manifest'

// Scanning utilities
export * from './scanning'

// Schema utilities
export * from './schema'

// Server factories (shared between CLI and Nitro)
export * from './server'

// Types
export * from './types'

// General utilities
export * from './utils'

// Validation utilities
export * from './validation'

// Watcher utilities
export * from './watcher'

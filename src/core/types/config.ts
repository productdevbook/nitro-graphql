/**
 * Core configuration types
 * Minimal framework-agnostic types — only what core functions actually need
 */

import type { GraphQLFramework } from '../constants'
import type { ClientCodegenConfig, ExternalServiceCodegenConfig, SdkCodegenConfig, ServerCodegenConfig } from './codegen'

/**
 * Core logger interface
 * Abstracts logging functionality for framework independence
 */
export interface CoreLogger {
  info: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
  error: (message: string, ...args: unknown[]) => void
  success: (message: string, ...args: unknown[]) => void
  debug: (message: string, ...args: unknown[]) => void
}

/**
 * Security configuration options
 * Single source of truth — re-exported as `SecurityConfig` in Nitro types
 */
export interface CoreSecurityConfig {
  /** Enable/disable GraphQL introspection */
  introspection?: boolean
  /** Enable/disable GraphQL playground */
  playground?: boolean
  /** Enable/disable error masking in responses */
  maskErrors?: boolean
  /** Disable field suggestions in error messages */
  disableSuggestions?: boolean
}

/**
 * Federation configuration
 * Base type — Nitro's FederationConfig extends this
 */
export interface CoreFederationConfig {
  /** Enable federation support */
  enabled?: boolean
  /** Service name for federation */
  serviceName?: string
}

/**
 * Codegen configuration
 * Uses the authoritative types from codegen.ts
 */
export interface CoreCodegenConfig {
  /** Server-side codegen options */
  server?: ServerCodegenConfig
  /** Client-side codegen options */
  client?: ClientCodegenConfig
  /** Client SDK codegen options */
  clientSDK?: SdkCodegenConfig
}

/**
 * External service with path overrides
 * Extends the codegen base type with UI-facing path config
 */
export interface CoreExternalService extends ExternalServiceCodegenConfig {
  /** Service-specific path overrides */
  paths?: {
    sdk?: string | boolean
    types?: string | boolean
    ofetch?: string | boolean
  }
}

/**
 * Core configuration
 * The resolved, fully-populated config used by core functions.
 * Created by adapters from framework-specific types.
 */
export interface CoreConfig {
  /** Root directory of the project */
  rootDir: string
  /** Build output directory */
  buildDir: string
  /** Server GraphQL directory */
  serverDir: string
  /** Client GraphQL directory */
  clientDir: string
  /** Types output directory */
  typesDir: string
  /** GraphQL framework to use */
  framework: GraphQLFramework
  /** Whether running in Nuxt context */
  isNuxt: boolean
  /** Whether running in development mode */
  isDev: boolean
  /** Logger instance */
  logger: CoreLogger
  /** Patterns to ignore during scanning */
  ignorePatterns: string[]
  /** Security configuration */
  security?: CoreSecurityConfig
  /** Federation configuration */
  federation?: CoreFederationConfig
  /** Codegen configuration */
  codegen?: CoreCodegenConfig
  /** External services */
  externalServices?: CoreExternalService[]
}

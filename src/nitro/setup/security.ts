/**
 * Security configuration resolver
 * Provides environment-aware defaults for GraphQL security settings
 */

import type { SecurityConfig } from '../types'

/**
 * Resolves security configuration with environment-aware defaults
 * In production: introspection off, playground off, errors masked, suggestions disabled
 * In development: introspection on, playground on, errors shown, suggestions enabled
 */
export function resolveSecurityConfig(config?: SecurityConfig): Required<SecurityConfig> {
  const isProd = process.env.NODE_ENV === 'production'
  return {
    introspection: config?.introspection ?? !isProd,
    playground: config?.playground ?? !isProd,
    maskErrors: config?.maskErrors ?? isProd,
    disableSuggestions: config?.disableSuggestions ?? isProd,
  }
}

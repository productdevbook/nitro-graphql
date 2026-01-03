/**
 * GraphQL schema validation utilities
 * Uses native Rust validator (apollo-compiler) for fast validation
 */

import consola from 'consola'
import { validateSchemas, validateSchemaStringWithPaths } from 'nitro-graphql/native'

/**
 * Validate GraphQL schemas using native Rust validator (apollo-compiler)
 * @returns true if validation passes, false if errors found
 */
export function validateNoDuplicateTypes(schemas: string[], schemaStrings: string[]): boolean {
  const result = validateSchemaStringWithPaths(schemaStrings, schemas)

  if (!result.valid) {
    for (const error of result.errors) {
      consola.error(error)
    }
    return false
  }

  return true
}

/**
 * Validate GraphQL schema files directly
 * @returns true if validation passes, false if errors found
 */
export function validateSchemaFiles(filePaths: string[]): boolean {
  const result = validateSchemas(filePaths)

  if (!result.valid) {
    for (const error of result.errors) {
      consola.error(error)
    }
    return false
  }

  return true
}

/**
 * Mock for nitro-graphql/native
 * Used in tests since native Rust bindings aren't available
 */

export function validateSchemas(_filePaths: string[]) {
  return { valid: true, errors: [] }
}

export function validateSchemaStringWithPaths(_schemas: string[], _paths: string[]) {
  return { valid: true, errors: [] }
}

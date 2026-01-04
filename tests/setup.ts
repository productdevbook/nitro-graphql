/**
 * Vitest setup file
 * Runs before all tests to configure the testing environment
 */

import { beforeAll, vi } from 'vitest'

// Mock native module (Rust bindings not available in test environment)
vi.mock('nitro-graphql/native', () => ({
  validateSchemas: () => ({ valid: true, errors: [] }),
  validateSchemaStringWithPaths: () => ({ valid: true, errors: [] }),
}))

beforeAll(() => {
  // Setup global test environment
})

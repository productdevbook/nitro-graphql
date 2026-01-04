/**
 * Vitest setup file
 * Runs before all tests to configure the testing environment
 */

import { beforeEach, vi } from 'vitest'

// Mock consola globally to suppress expected error logs during tests
vi.mock('consola', async (importOriginal) => {
  const actual = await importOriginal<typeof import('consola')>()
  const mockLogger = {
    ...actual.default,
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
    log: vi.fn(),
    withTag: vi.fn(() => mockLogger),
  }
  return {
    ...actual,
    default: mockLogger,
    consola: mockLogger,
  }
})

// Also suppress console.error for expected errors during tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

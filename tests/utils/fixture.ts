/**
 * Test fixture isolation utilities
 *
 * Creates isolated copies of fixtures to avoid conflicts
 * when tests run in parallel.
 */

import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'pathe'

const TEMP_DIR = resolve(__dirname, '../.temp')

/**
 * Create an isolated copy of a fixture for testing
 *
 * @param fixturePath - Path to the original fixture
 * @returns Path to the isolated copy
 */
export function createIsolatedFixture(fixturePath: string): string {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const fixtureName = fixturePath.split('/').pop() || 'fixture'
  const isolatedPath = join(TEMP_DIR, `${fixtureName}-${id}`)

  // Ensure temp directory exists
  if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR, { recursive: true })
  }

  // Copy fixture to isolated directory
  cpSync(fixturePath, isolatedPath, { recursive: true })

  return isolatedPath
}

/**
 * Clean up an isolated fixture
 *
 * @param isolatedPath - Path to the isolated fixture
 */
export function cleanupIsolatedFixture(isolatedPath: string): void {
  if (isolatedPath.includes('.temp') && existsSync(isolatedPath)) {
    rmSync(isolatedPath, { recursive: true, force: true })
  }
}

/**
 * Clean up all temp fixtures (call in globalSetup/globalTeardown)
 */
export function cleanupAllTempFixtures(): void {
  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true, force: true })
  }
}

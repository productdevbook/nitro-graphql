/**
 * Vitest global setup
 * Runs once before all tests to clean fixture caches
 */

import { existsSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { glob } from 'tinyglobby'

export async function setup() {
  const fixturesDir = resolve(__dirname, 'fixtures')
  if (!existsSync(fixturesDir))
    return

  // Find and remove all cache directories
  const cacheDirs = await glob(['**/.nitro', '**/.graphql', '**/.nuxt'], {
    cwd: fixturesDir,
    absolute: true,
    onlyDirectories: true,
  })

  for (const dir of cacheDirs) {
    try {
      rmSync(dir, { recursive: true, force: true })
    }
    catch {
      // Ignore errors
    }
  }
}

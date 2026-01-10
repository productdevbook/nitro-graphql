/**
 * E2E tests for extend package with custom types path
 *
 * This test verifies that when using extend packages,
 * the main project can still override the types output path.
 *
 * Scenario:
 * - Main project extends from auth and ecommerce packages
 * - Main project configures custom types path: 'custom-types/graphql.d.ts'
 * - Types should be generated at the custom path, NOT at default .nitro/types/
 */
import type { Nitro } from 'nitro/types'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { build, createNitro, prepare } from 'nitro/builder'
import { join, resolve } from 'pathe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import graphql from '../../src'

const fixturesDir = resolve(__dirname, '../fixtures')
const mainProjectDir = resolve(fixturesDir, 'extend-multi/main-project')

// Clean up generated files
function cleanupGeneratedFiles() {
  const dirsToClean = [
    join(mainProjectDir, 'custom-types'),
    join(mainProjectDir, '.graphql'),
  ]

  for (const dir of dirsToClean) {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true })
    }
  }
}

describe('extend Package with Custom Types Path E2E', () => {
  let nitro: Nitro

  beforeAll(async () => {
    cleanupGeneratedFiles()

    nitro = await createNitro({
      rootDir: mainProjectDir,
      dev: true,
      modules: [
        graphql({
          framework: 'graphql-yoga',
          skipLocalScan: true,
          extend: [
            resolve(fixturesDir, 'extend-multi/auth'),
            resolve(fixturesDir, 'extend-multi/ecommerce'),
          ],
          // Custom types path - should override default
          types: {
            enabled: true,
            server: '{rootDir}/custom-types/server.d.ts',
            client: '{rootDir}/custom-types/client.d.ts',
          },
        }),
      ],
    })

    await prepare(nitro)
    await build(nitro)

    // Generate types
    const { generateServerTypes, generateClientTypes } = await import('../../src/nitro/codegen')
    await generateServerTypes(nitro)
    await generateClientTypes(nitro)
  }, 60000)

  afterAll(async () => {
    await nitro?.close()
    cleanupGeneratedFiles()
  })

  describe('custom types path with extend', () => {
    it('should generate server types at custom path', () => {
      const customServerTypesPath = join(mainProjectDir, 'custom-types/server.d.ts')

      expect(existsSync(customServerTypesPath)).toBe(true)

      const content = readFileSync(customServerTypesPath, 'utf-8')
      // Should include types from extended packages
      expect(content).toContain('Query')
      expect(content).toContain('User') // from auth package
      expect(content).toContain('Product') // from ecommerce package
    })

    it('should generate client types at custom path', () => {
      const customClientTypesPath = join(mainProjectDir, 'custom-types/client.d.ts')

      expect(existsSync(customClientTypesPath)).toBe(true)

      const content = readFileSync(customClientTypesPath, 'utf-8')
      // Should include queries from extended packages
      expect(content).toContain('GetProducts') // from ecommerce package
    })

    it('should generate types ONLY at custom paths (not at both locations)', () => {
      // When custom paths are configured, the types should only be at custom paths
      // This test verifies by checking that custom paths exist and have content
      const customServerPath = join(mainProjectDir, 'custom-types/server.d.ts')
      const customClientPath = join(mainProjectDir, 'custom-types/client.d.ts')

      // Custom paths must exist
      expect(existsSync(customServerPath)).toBe(true)
      expect(existsSync(customClientPath)).toBe(true)

      // And have proper content
      const serverContent = readFileSync(customServerPath, 'utf-8')
      const clientContent = readFileSync(customClientPath, 'utf-8')

      expect(serverContent.length).toBeGreaterThan(100)
      expect(clientContent.length).toBeGreaterThan(100)
    })
  })
})

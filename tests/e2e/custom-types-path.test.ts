/**
 * E2E tests for custom types path configuration
 *
 * This test verifies that types files are generated at custom paths
 * when configured via the `types` option.
 *
 * Scenarios tested:
 * - Custom server types path with {rootDir} placeholder
 * - Custom client types path with {typesDir} placeholder
 * - Disabled client types (client: false)
 * - Default paths when types is true
 */
import type { Nitro } from 'nitro/types'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { build, createNitro, prepare } from 'nitro/builder'
import { join, resolve } from 'pathe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import graphql from '../../src'

const fixturesDir = resolve(__dirname, '../fixtures')
const projectDir = resolve(fixturesDir, 'custom-types-path')

// Clean up generated files
function cleanupGeneratedFiles() {
  const dirsToClean = [
    join(projectDir, '.nitro'),
    join(projectDir, '.output'),
    join(projectDir, 'generated'),
    join(projectDir, 'custom-types'),
  ]

  for (const dir of dirsToClean) {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true })
    }
  }
}

describe('custom Types Path E2E', () => {
  // Note: cleanup is done in beforeAll of each describe block, not afterEach
  // This prevents files from being deleted between tests in the same group

  describe('custom server and client types paths', () => {
    let nitro: Nitro

    beforeAll(async () => {
      cleanupGeneratedFiles()

      nitro = await createNitro({
        rootDir: projectDir,
        dev: true,
        modules: [
          graphql({
            framework: 'graphql-yoga',
            types: {
              enabled: true,
              server: '{rootDir}/generated/server-types.d.ts',
              client: '{rootDir}/generated/client-types.d.ts',
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
    })

    it('should generate server types at custom path', () => {
      const customServerTypesPath = join(projectDir, 'generated/server-types.d.ts')

      expect(existsSync(customServerTypesPath)).toBe(true)

      const content = readFileSync(customServerTypesPath, 'utf-8')
      expect(content).toContain('Query')
      expect(content).toContain('User')
    })

    it('should generate client types at custom path', () => {
      const customClientTypesPath = join(projectDir, 'generated/client-types.d.ts')

      expect(existsSync(customClientTypesPath)).toBe(true)

      const content = readFileSync(customClientTypesPath, 'utf-8')
      expect(content).toContain('GetUser')
      expect(content).toContain('GetHello')
    })

    it('should NOT generate types at default paths', () => {
      const defaultServerPath = join(projectDir, '.nitro/types/nitro-graphql-server.d.ts')
      const defaultClientPath = join(projectDir, '.nitro/types/nitro-graphql-client.d.ts')

      // Default paths should NOT exist when custom paths are configured
      expect(existsSync(defaultServerPath)).toBe(false)
      expect(existsSync(defaultClientPath)).toBe(false)
    })
  })

  describe('disabled client types', () => {
    let nitro: Nitro

    beforeAll(async () => {
      cleanupGeneratedFiles()

      nitro = await createNitro({
        rootDir: projectDir,
        dev: true,
        modules: [
          graphql({
            framework: 'graphql-yoga',
            types: {
              enabled: true,
              server: '{rootDir}/custom-types/server.d.ts',
              client: false, // Disable client types
            },
          }),
        ],
      })

      await prepare(nitro)
      await build(nitro)

      const { generateServerTypes, generateClientTypes } = await import('../../src/nitro/codegen')
      await generateServerTypes(nitro)
      await generateClientTypes(nitro)
    }, 60000)

    afterAll(async () => {
      await nitro?.close()
    })

    it('should generate server types when enabled', () => {
      const serverTypesPath = join(projectDir, 'custom-types/server.d.ts')

      expect(existsSync(serverTypesPath)).toBe(true)

      const content = readFileSync(serverTypesPath, 'utf-8')
      expect(content).toContain('Query')
    })

    it('should NOT generate client types when disabled', () => {
      const defaultClientPath = join(projectDir, '.nitro/types/nitro-graphql-client.d.ts')
      const customClientPath = join(projectDir, 'custom-types/client.d.ts')

      expect(existsSync(defaultClientPath)).toBe(false)
      expect(existsSync(customClientPath)).toBe(false)
    })
  })

  describe('typesDir placeholder', () => {
    let nitro: Nitro

    beforeAll(async () => {
      cleanupGeneratedFiles()

      nitro = await createNitro({
        rootDir: projectDir,
        dev: true,
        modules: [
          graphql({
            framework: 'graphql-yoga',
            types: {
              enabled: true,
              server: '{typesDir}/custom-server.d.ts',
              client: '{typesDir}/custom-client.d.ts',
            },
          }),
        ],
      })

      await prepare(nitro)
      await build(nitro)

      const { generateServerTypes, generateClientTypes } = await import('../../src/nitro/codegen')
      await generateServerTypes(nitro)
      await generateClientTypes(nitro)
    }, 60000)

    afterAll(async () => {
      await nitro?.close()
    })

    it('should resolve {typesDir} placeholder correctly', () => {
      // typesDir defaults to {buildDir}/types - buildDir is node_modules/.nitro in test env
      const serverTypesPath = join(nitro.options.buildDir, 'types/custom-server.d.ts')
      const clientTypesPath = join(nitro.options.buildDir, 'types/custom-client.d.ts')

      expect(existsSync(serverTypesPath)).toBe(true)
      expect(existsSync(clientTypesPath)).toBe(true)
    })

    it('should contain correct type definitions', () => {
      const serverTypesPath = join(nitro.options.buildDir, 'types/custom-server.d.ts')
      const clientTypesPath = join(nitro.options.buildDir, 'types/custom-client.d.ts')

      const serverContent = readFileSync(serverTypesPath, 'utf-8')
      expect(serverContent).toContain('Query')
      expect(serverContent).toContain('User')

      const clientContent = readFileSync(clientTypesPath, 'utf-8')
      expect(clientContent).toContain('GetUser')
    })
  })
})

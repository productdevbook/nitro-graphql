/**
 * E2E test for Nitro module with relative parent paths for types
 * 
 * This tests the real scenario where:
 * - GraphQL package is in packages/graphql
 * - Types should be written to ../../apps/ecommerce/app/graphql/types/index.d.ts
 */
import type { Nitro } from 'nitro/types'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { build, createNitro, prepare } from 'nitro/builder'
import { join, resolve } from 'pathe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import graphql from '../../src'

const fixturesDir = resolve(__dirname, '../fixtures')
const projectDir = resolve(fixturesDir, 'nitro-relative-parent/packages/graphql')
const appsDir = resolve(fixturesDir, 'nitro-relative-parent/apps/ecommerce/app/graphql')

// Clean up generated files
function cleanupGeneratedFiles() {
  const dirsToClean = [
    join(projectDir, '.nitro'),
    join(projectDir, '.output'),
    join(projectDir, 'node_modules/.nitro'),
    resolve(fixturesDir, 'nitro-relative-parent/apps/ecommerce/app/graphql/types'),
    resolve(fixturesDir, 'nitro-relative-parent/apps/ecommerce/app/graphql/default'),
  ]

  for (const dir of dirsToClean) {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true })
    }
  }
}

describe('Nitro Module with Relative Parent Paths E2E', () => {
  let nitro: Nitro

  beforeAll(async () => {
    cleanupGeneratedFiles()

    nitro = await createNitro({
      rootDir: projectDir,
      dev: true,
      modules: [
        graphql({
          framework: 'graphql-yoga',
          serverDir: './',
          clientDir: '../../apps/ecommerce/app/graphql',
          types: {
            enabled: true,
            server: './.nitro/types/server.d.ts',
            client: '../../apps/ecommerce/app/graphql/types/index.d.ts',
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

  it('should generate client types at relative parent path', () => {
    const clientTypesPath = resolve(fixturesDir, 'nitro-relative-parent/apps/ecommerce/app/graphql/types/index.d.ts')

    expect(existsSync(clientTypesPath)).toBe(true)

    const content = readFileSync(clientTypesPath, 'utf-8')
    expect(content).toContain('GetUser')
    expect(content).toContain('GetHello')
  })

  it('should generate server types at specified path', () => {
    const serverTypesPath = join(projectDir, '.nitro/types/server.d.ts')

    expect(existsSync(serverTypesPath)).toBe(true)

    const content = readFileSync(serverTypesPath, 'utf-8')
    expect(content).toContain('Query')
    expect(content).toContain('User')
  })
})

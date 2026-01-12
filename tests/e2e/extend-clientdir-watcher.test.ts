/**
 * E2E test for file watcher with package-based extends clientDir
 *
 * This test verifies that when using package-based extends with clientDir configured,
 * the file watcher correctly watches the extend package's clientDir and regenerates
 * client types when .graphql files change.
 *
 * Bug: resolveExtendDirs only adds serverDir to watchDirs, not clientDir
 */
import type { Nitro } from 'nitro/types'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { build, createNitro, prepare } from 'nitro/builder'
import { join, resolve } from 'pathe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import graphql from '../../src'

const fixturesDir = resolve(__dirname, '../fixtures')
const mainProjectDir = resolve(fixturesDir, 'extend-multi/main-project')
const ecommerceDir = resolve(fixturesDir, 'extend-multi/ecommerce')
const ecommerceClientDir = resolve(ecommerceDir, 'client/graphql')
const clientQueryPath = join(ecommerceClientDir, 'products.graphql')

// Note: nitro-graphql uses .graphql as the output directory for types
const graphqlBuildDir = join(mainProjectDir, '.graphql')
const clientTypesPath = join(graphqlBuildDir, 'nitro-graphql-client.d.ts')

// Initial client query
const initialQuery = `query GetProducts {
  products {
    id
    name
    price
  }
}
`

// Updated client query with new GetAllProducts query
const updatedQuery = `query GetProducts {
  products {
    id
    name
    price
  }
}

query GetAllProducts {
  products {
    id
    name
    price
  }
}
`

// Clean up generated files
function cleanupGeneratedFiles() {
  const dirsToClean = [
    join(mainProjectDir, '.nitro'),
    join(mainProjectDir, '.output'),
    join(mainProjectDir, '.graphql'),
    join(mainProjectDir, 'node_modules/.nitro'),
  ]

  for (const dir of dirsToClean) {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true })
    }
  }
}

// Reset fixture files to initial state
function resetFixtureFiles() {
  writeFileSync(clientQueryPath, initialQuery, 'utf-8')
}

// Helper to wait for file to be updated
async function waitForFileChange(
  filePath: string,
  expectedContent: string,
  timeout = 5000,
): Promise<boolean> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8')
      if (content.includes(expectedContent)) {
        return true
      }
    }
    await new Promise(r => setTimeout(r, 100))
  }

  return false
}

describe('extend Package clientDir File Watcher E2E', () => {
  let nitro: Nitro

  beforeAll(async () => {
    cleanupGeneratedFiles()
    resetFixtureFiles()

    // Create Nitro with dev mode and package-based extends
    nitro = await createNitro({
      rootDir: mainProjectDir,
      dev: true, // This enables file watching
      modules: [
        graphql({
          framework: 'graphql-yoga',
          skipLocalScan: true,
          extend: [
            resolve(fixturesDir, 'extend-multi/auth'),
            resolve(fixturesDir, 'extend-multi/ecommerce'),
          ],
        }),
      ],
    })

    await prepare(nitro)
    await build(nitro)

    // Wait for initial type generation
    await new Promise(r => setTimeout(r, 500))
  }, 60000)

  afterAll(async () => {
    await nitro?.close()
    cleanupGeneratedFiles()
    resetFixtureFiles()
  })

  it('should include extend package clientDir in watchDirs', () => {
    const watchDirs = nitro.graphql.watchDirs || []

    // Should include the ecommerce package's clientDir
    const hasEcommerceClientDir = watchDirs.some((dir: string) =>
      dir.includes('ecommerce') && dir.includes('client/graphql'),
    )

    expect(hasEcommerceClientDir).toBe(true)
  })

  it('should have generated initial client types from extend package', () => {
    expect(existsSync(clientTypesPath)).toBe(true)

    const content = readFileSync(clientTypesPath, 'utf-8')
    expect(content).toContain('GetProducts')
    // Should NOT contain GetAllProducts yet
    expect(content).not.toContain('GetAllProducts')
  })

  it('should regenerate client types when extend package clientDir .graphql file changes', async () => {
    // Verify initial state - no GetAllProducts
    const initialContent = readFileSync(clientTypesPath, 'utf-8')
    expect(initialContent).not.toContain('GetAllProducts')

    // Modify the query file in the extend package's clientDir
    writeFileSync(clientQueryPath, updatedQuery, 'utf-8')

    // Wait for file watcher to detect change and regenerate types
    // File watcher has 150ms debounce + processing time
    const found = await waitForFileChange(clientTypesPath, 'GetAllProducts', 5000)

    expect(found).toBe(true)

    // Verify the new query type is present
    const updatedContent = readFileSync(clientTypesPath, 'utf-8')
    expect(updatedContent).toContain('GetAllProducts')
    expect(updatedContent).toContain('GetProducts')
  }, 10000)
})

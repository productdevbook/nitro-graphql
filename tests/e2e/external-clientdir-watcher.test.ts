/**
 * E2E test for file watcher with external clientDir
 *
 * This test verifies that when clientDir is set to a path outside the project root
 * (e.g., ../../apps/ecommerce/app/graphql), the file watcher:
 * - Correctly watches the external directory
 * - Regenerates client types when .graphql files change in that directory
 */
import type { Nitro } from 'nitro/types'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { build, createNitro, prepare } from 'nitro/builder'
import { join, resolve } from 'pathe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import graphql from '../../src'

const fixturesDir = resolve(__dirname, '../fixtures')
const projectDir = resolve(fixturesDir, 'nitro-relative-parent/packages/graphql')
const externalClientDir = resolve(fixturesDir, 'nitro-relative-parent/apps/ecommerce/app/graphql')
const clientQueryPath = join(externalClientDir, 'queries.graphql')

// Note: nitro-graphql uses .graphql as the output directory for types (nitro.graphql.buildDir)
const graphqlBuildDir = join(projectDir, '.graphql')
const clientTypesPath = join(graphqlBuildDir, 'nitro-graphql-client.d.ts')
const serverTypesPath = join(graphqlBuildDir, 'nitro-graphql-server.d.ts')

// Initial client query
const initialQuery = `query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
  }
}

query GetHello {
  hello
}
`

// Updated client query with new GetUserDetails query
const updatedQuery = `query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
  }
}

query GetHello {
  hello
}

query GetUserDetails($id: ID!) {
  user(id: $id) {
    id
    name
  }
  hello
}
`

// Clean up generated files
function cleanupGeneratedFiles() {
  const dirsToClean = [
    join(projectDir, '.nitro'),
    join(projectDir, '.output'),
    join(projectDir, '.graphql'),
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

describe('external clientDir File Watcher E2E', () => {
  let nitro: Nitro
  let initialServerTypesContent: string

  beforeAll(async () => {
    cleanupGeneratedFiles()
    resetFixtureFiles()

    // Create Nitro with dev mode and external clientDir
    nitro = await createNitro({
      rootDir: projectDir,
      dev: true, // This enables file watching
      modules: [
        graphql({
          framework: 'graphql-yoga',
          clientDir: '../../apps/ecommerce/app/graphql',
        }),
      ],
    })

    await prepare(nitro)
    await build(nitro)

    // Wait for initial type generation
    await new Promise(r => setTimeout(r, 500))

    // Store initial server types content for comparison
    if (existsSync(serverTypesPath)) {
      initialServerTypesContent = readFileSync(serverTypesPath, 'utf-8')
    }
  }, 60000)

  afterAll(async () => {
    await nitro?.close()
    cleanupGeneratedFiles()
    resetFixtureFiles()
  })

  it('should have generated initial types from external clientDir', () => {
    expect(existsSync(clientTypesPath)).toBe(true)
    expect(existsSync(serverTypesPath)).toBe(true)

    const clientContent = readFileSync(clientTypesPath, 'utf-8')
    expect(clientContent).toContain('GetUser')
    expect(clientContent).toContain('GetHello')
    // Should NOT contain GetUserDetails yet
    expect(clientContent).not.toContain('GetUserDetails')
  })

  it('should regenerate client types when external clientDir .graphql file changes', async () => {
    // Verify initial state - no GetUserDetails
    const initialContent = readFileSync(clientTypesPath, 'utf-8')
    expect(initialContent).not.toContain('GetUserDetails')

    // Modify the query file in the external clientDir
    writeFileSync(clientQueryPath, updatedQuery, 'utf-8')

    // Wait for file watcher to detect change and regenerate types
    // File watcher has 150ms debounce + processing time
    const found = await waitForFileChange(clientTypesPath, 'GetUserDetails', 5000)

    expect(found).toBe(true)

    // Verify the new query type is present
    const updatedContent = readFileSync(clientTypesPath, 'utf-8')
    expect(updatedContent).toContain('GetUserDetails')
    expect(updatedContent).toContain('GetUser')
    expect(updatedContent).toContain('GetHello')
  }, 10000)

  it('should NOT trigger server type regeneration for client-only changes', () => {
    // Server types should remain unchanged when only client files change
    const currentServerContent = readFileSync(serverTypesPath, 'utf-8')

    // The content should be the same (server types shouldn't have been regenerated)
    // Note: We're comparing content, not timestamps, because content is what matters
    expect(currentServerContent).toContain('Query')
    expect(currentServerContent).toContain('User')

    // Verify the structure is the same as initial
    expect(currentServerContent).toBe(initialServerTypesContent)
  })
})

/**
 * Integration test for Nuxt file watcher type regeneration
 *
 * This test uses REAL Nuxt with file watching enabled to verify that:
 * - File watcher detects .graphql file changes in Nuxt projects
 * - Type regeneration is triggered automatically
 * - New types appear in the generated type files
 */
import type { Nuxt } from 'nuxt/schema'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { build, loadNuxt } from 'nuxt'
import { join, resolve } from 'pathe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const playgroundDir = resolve(__dirname, '../../playgrounds/nuxt')
const serverSchemaPath = join(playgroundDir, 'server/graphql/schema.graphql')
const graphqlBuildDir = join(playgroundDir, '.graphql')
const serverTypesPath = join(graphqlBuildDir, 'nitro-graphql-server.d.ts')

// Original schema content - must match what's in git
const originalSchemaContent = `type Query {
  hello: String!
  greeting(name: String!): String!
}
`

// Schema with new TestPost type for hot reload testing
const schemaWithTestPost = `type Query {
  hello: String!
  greeting(name: String!): String!
  testPosts: [TestPost!]!
}

type TestPost {
  id: ID!
  title: String!
  body: String!
}
`

// Helper to wait for file to be updated
async function waitForFileChange(
  filePath: string,
  expectedContent: string,
  timeout = 10000,
): Promise<boolean> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8')
      if (content.includes(expectedContent)) {
        return true
      }
    }
    await new Promise(r => setTimeout(r, 200))
  }

  return false
}

describe('Nuxt File Watcher Integration Test', () => {
  let nuxt: Nuxt

  beforeAll(async () => {
    // Ensure schema is in original state before starting
    writeFileSync(serverSchemaPath, originalSchemaContent, 'utf-8')

    // Load and build Nuxt with dev mode
    nuxt = await loadNuxt({
      cwd: playgroundDir,
      ready: true,
      overrides: {
        dev: true,
      },
    })
    await build(nuxt)

    // Wait for initial type generation
    await new Promise(r => setTimeout(r, 1000))
  }, 120000)

  afterAll(async () => {
    // Restore original schema
    writeFileSync(serverSchemaPath, originalSchemaContent, 'utf-8')

    await nuxt?.close()

    // Wait for file watcher to process the restore
    await new Promise(r => setTimeout(r, 500))
  })

  it('should have generated initial types', () => {
    expect(existsSync(serverTypesPath)).toBe(true)

    const serverContent = readFileSync(serverTypesPath, 'utf-8')
    expect(serverContent).toContain('Query')
    expect(serverContent).toContain('hello')
    // Should not contain TestPost yet
    expect(serverContent).not.toContain('TestPost')
  })

  it('should regenerate types when schema.graphql is modified', async () => {
    // Verify initial state - no TestPost type
    const initialContent = readFileSync(serverTypesPath, 'utf-8')
    expect(initialContent).not.toContain('TestPost')

    // Modify the schema file - this should trigger the file watcher
    writeFileSync(serverSchemaPath, schemaWithTestPost, 'utf-8')

    // Wait for file watcher to detect change and regenerate types
    // Nuxt file watcher has debounce + processing time
    const found = await waitForFileChange(serverTypesPath, 'TestPost', 10000)

    expect(found).toBe(true)

    // Verify the new types are present
    const updatedContent = readFileSync(serverTypesPath, 'utf-8')
    expect(updatedContent).toContain('TestPost')
    expect(updatedContent).toContain('testPosts')
    expect(updatedContent).toContain('title')
    expect(updatedContent).toContain('body')
  }, 15000)

  it('should restore original types when schema is restored', async () => {
    // Restore original schema
    writeFileSync(serverSchemaPath, originalSchemaContent, 'utf-8')

    // Wait for file watcher to detect change
    const restored = await waitForFileChange(serverTypesPath, 'greeting', 10000)
    expect(restored).toBe(true)

    // Give it a bit more time to fully process
    await new Promise(r => setTimeout(r, 500))

    // Verify TestPost is gone and original types are back
    const restoredContent = readFileSync(serverTypesPath, 'utf-8')
    expect(restoredContent).toContain('hello')
    expect(restoredContent).toContain('greeting')
    expect(restoredContent).not.toContain('TestPost')
  }, 15000)
})

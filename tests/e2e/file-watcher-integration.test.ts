/**
 * Integration test for file watcher type regeneration
 *
 * This test uses REAL Nitro with file watching enabled to verify that:
 * - File watcher detects .graphql file changes
 * - Type regeneration is triggered automatically
 * - New types appear in the generated type files
 *
 * This is different from unit tests which mock the codegen functions.
 */
import type { Nitro } from 'nitro/types'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { build, createNitro, prepare } from 'nitro/builder'
import { join, resolve } from 'pathe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import graphql from '../../src'

const fixturesDir = resolve(__dirname, '../fixtures')
const projectDir = resolve(fixturesDir, 'hot-reload-types')
const serverSchemaPath = join(projectDir, 'server/graphql/schema.graphql')
const clientQueryPath = join(projectDir, 'graphql/queries.graphql')
const graphqlBuildDir = join(projectDir, '.graphql')
const serverTypesPath = join(graphqlBuildDir, 'nitro-graphql-server.d.ts')
const clientTypesPath = join(graphqlBuildDir, 'nitro-graphql-client.d.ts')

// Initial schema content
const initialSchema = `type Query {
  hello: String!
  user(id: ID!): User
}

type User {
  id: ID!
  name: String!
}
`

// Updated schema with new Post type
const updatedSchema = `type Query {
  hello: String!
  user(id: ID!): User
  posts: [Post!]!
}

type User {
  id: ID!
  name: String!
  email: String
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
}
`

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

// Clean up generated files
function cleanupGeneratedFiles() {
  const dirsToClean = [
    join(projectDir, '.nitro'),
    join(projectDir, '.output'),
    join(projectDir, '.graphql'),
    join(projectDir, 'node_modules/.nitro'),
  ]

  for (const dir of dirsToClean) {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true })
    }
  }
}

// Reset fixture files to initial state
function resetFixtureFiles() {
  writeFileSync(serverSchemaPath, initialSchema, 'utf-8')
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

describe('file Watcher Integration Test - Real Nitro', () => {
  let nitro: Nitro

  beforeAll(async () => {
    cleanupGeneratedFiles()
    resetFixtureFiles()

    // Create Nitro with dev mode - this sets up file watching
    nitro = await createNitro({
      rootDir: projectDir,
      dev: true, // This enables file watching
      modules: [
        graphql({
          framework: 'graphql-yoga',
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

  it('should have generated initial types', () => {
    expect(existsSync(serverTypesPath)).toBe(true)
    expect(existsSync(clientTypesPath)).toBe(true)

    const serverContent = readFileSync(serverTypesPath, 'utf-8')
    expect(serverContent).toContain('Query')
    expect(serverContent).toContain('User')
    expect(serverContent).not.toContain('Post')
  })

  it('should regenerate types when schema.graphql is modified', async () => {
    // Verify initial state - no Post type
    const initialContent = readFileSync(serverTypesPath, 'utf-8')
    expect(initialContent).not.toContain('Post')

    // Modify the schema file - this should trigger the file watcher
    writeFileSync(serverSchemaPath, updatedSchema, 'utf-8')

    // Wait for file watcher to detect change and regenerate types
    // File watcher has 150ms debounce + processing time
    const found = await waitForFileChange(serverTypesPath, 'Post', 5000)

    expect(found).toBe(true)

    // Verify the new types are present
    const updatedContent = readFileSync(serverTypesPath, 'utf-8')
    expect(updatedContent).toContain('Post')
    expect(updatedContent).toContain('posts')
    expect(updatedContent).toContain('email')
    expect(updatedContent).toContain('author')
  }, 10000)

  it('should also update client types when schema changes', async () => {
    // Client types should have been regenerated along with server types
    const clientContent = readFileSync(clientTypesPath, 'utf-8')

    // Client types should still contain the original queries
    expect(clientContent).toContain('GetUser')
    expect(clientContent).toContain('GetHello')
  })
})

/**
 * E2E test for hot reload type regeneration
 *
 * This test verifies that when .graphql files are modified:
 * - Server types are regenerated correctly
 * - Client types are regenerated correctly
 * - New types/fields appear in the generated type files
 *
 * This tests the core functionality that the file watcher depends on.
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
// Note: nitro-graphql uses .graphql as the output directory for types (nitro.graphql.buildDir)
// This is separate from nitro.options.buildDir which is node_modules/.nitro
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

// Updated schema with new Post type and field
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

// Updated client query with new GetPosts query
const updatedQuery = `query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
  }
}

query GetHello {
  hello
}

query GetPosts {
  posts {
    id
    title
    content
    author {
      id
      name
    }
  }
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

describe('Hot Reload Type Regeneration E2E', () => {
  let nitro: Nitro

  beforeAll(async () => {
    cleanupGeneratedFiles()
    resetFixtureFiles()

    nitro = await createNitro({
      rootDir: projectDir,
      dev: true,
      modules: [
        graphql({
          framework: 'graphql-yoga',
        }),
      ],
    })

    await prepare(nitro)
    await build(nitro)

    // Generate initial types
    const { generateServerTypes, generateClientTypes } = await import('../../src/nitro/codegen')
    await generateServerTypes(nitro)
    await generateClientTypes(nitro)
  }, 60000)

  afterAll(async () => {
    await nitro?.close()
    cleanupGeneratedFiles()
    resetFixtureFiles()
  })

  it('should generate initial server types', () => {
    expect(existsSync(serverTypesPath)).toBe(true)

    const content = readFileSync(serverTypesPath, 'utf-8')
    expect(content).toContain('Query')
    expect(content).toContain('User')
    // Should NOT contain Post yet
    expect(content).not.toContain('Post')
  })

  it('should generate initial client types', () => {
    expect(existsSync(clientTypesPath)).toBe(true)

    const content = readFileSync(clientTypesPath, 'utf-8')
    expect(content).toContain('GetUser')
    expect(content).toContain('GetHello')
    // Should NOT contain GetPosts yet
    expect(content).not.toContain('GetPosts')
  })

  it('should regenerate server types after schema file modification', async () => {
    // Modify the schema file (simulate hot reload trigger)
    writeFileSync(serverSchemaPath, updatedSchema, 'utf-8')

    // Manually trigger rescan and type regeneration (what the file watcher should do)
    const { performGraphQLScan } = await import('../../src/nitro/setup/scanner')
    const { generateServerTypes } = await import('../../src/nitro/codegen')

    await performGraphQLScan(nitro, { silent: true, isRescan: true })
    await generateServerTypes(nitro, { silent: true })

    // Verify new types are present
    const content = readFileSync(serverTypesPath, 'utf-8')
    expect(content).toContain('Post')
    expect(content).toContain('posts')
    expect(content).toContain('email')
    expect(content).toContain('author')
  })

  it('should regenerate client types after client query file modification', async () => {
    // Update client queries (schema is already updated from previous test)
    writeFileSync(clientQueryPath, updatedQuery, 'utf-8')

    // Manually trigger type regeneration
    const { performGraphQLScan } = await import('../../src/nitro/setup/scanner')
    const { generateClientTypes } = await import('../../src/nitro/codegen')

    await performGraphQLScan(nitro, { silent: true, isRescan: true })
    await generateClientTypes(nitro, { silent: true })

    // Verify new query types are present
    const content = readFileSync(clientTypesPath, 'utf-8')
    expect(content).toContain('GetPosts')
    expect(content).toContain('email')
  })

  it('should preserve existing types after regeneration', async () => {
    // Verify original types still exist after regeneration
    const serverContent = readFileSync(serverTypesPath, 'utf-8')
    expect(serverContent).toContain('Query')
    expect(serverContent).toContain('User')
    expect(serverContent).toContain('hello')

    const clientContent = readFileSync(clientTypesPath, 'utf-8')
    expect(clientContent).toContain('GetUser')
    expect(clientContent).toContain('GetHello')
  })
})

describe('Hot Reload - Schema Change Only', () => {
  let nitro: Nitro

  beforeAll(async () => {
    cleanupGeneratedFiles()
    resetFixtureFiles()

    nitro = await createNitro({
      rootDir: projectDir,
      dev: true,
      modules: [
        graphql({
          framework: 'graphql-yoga',
        }),
      ],
    })

    await prepare(nitro)
    await build(nitro)

    // Generate initial types
    const { generateServerTypes, generateClientTypes } = await import('../../src/nitro/codegen')
    await generateServerTypes(nitro)
    await generateClientTypes(nitro)
  }, 60000)

  afterAll(async () => {
    await nitro?.close()
    cleanupGeneratedFiles()
    resetFixtureFiles()
  })

  it('should regenerate both server and client types when schema changes', async () => {
    // Get initial modification time of type files
    const initialServerContent = readFileSync(serverTypesPath, 'utf-8')
    const initialClientContent = readFileSync(clientTypesPath, 'utf-8')

    // Verify initial state - no Post type
    expect(initialServerContent).not.toContain('Post')
    expect(initialClientContent).not.toContain('Post')

    // Update only the schema (add Post type but don't add GetPosts query)
    writeFileSync(serverSchemaPath, updatedSchema, 'utf-8')

    // Trigger what the file watcher processChanges does for server changes
    const { performGraphQLScan } = await import('../../src/nitro/setup/scanner')
    const { generateServerTypes, generateClientTypes } = await import('../../src/nitro/codegen')

    await performGraphQLScan(nitro, { silent: true, isRescan: true })
    await generateServerTypes(nitro, { silent: true })
    await generateClientTypes(nitro, { silent: true })

    // Verify server types now contain Post
    const newServerContent = readFileSync(serverTypesPath, 'utf-8')
    expect(newServerContent).toContain('Post')
    expect(newServerContent).toContain('posts')
    expect(newServerContent).not.toBe(initialServerContent)

    // Client types should still be valid (even without new queries)
    const newClientContent = readFileSync(clientTypesPath, 'utf-8')
    expect(newClientContent).toContain('GetUser')
    expect(newClientContent).toContain('GetHello')
  })
})

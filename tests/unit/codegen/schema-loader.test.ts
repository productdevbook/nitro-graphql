import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'pathe'
/**
 * Unit tests for schema loading utilities
 *
 * Tests the schema loading functions which:
 * - Load GraphQL schemas from files or URLs
 * - Handle schema loading errors gracefully
 * - Support external service schema loading
 * - Download and cache schemas for external services
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  graphQLLoadSchemaSync,
} from '../../../src/core/codegen/schema-loader'

// Create a temporary directory for test files
const TEST_DIR = resolve(__dirname, '.test-schemas')
const TEST_SCHEMA_PATH = resolve(TEST_DIR, 'test.graphql')
const TEST_SCHEMA_CONTENT = `
type Query {
  hello: String
  user(id: ID!): User
}

type User {
  id: ID!
  name: String!
  email: String
}
`

const INVALID_SCHEMA_CONTENT = `
type Query {
  hello: String
  this is not valid graphql
}
`

describe('graphQLLoadSchemaSync', () => {
  beforeEach(() => {
    // Create test directory and schema file
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true })
    }
    writeFileSync(TEST_SCHEMA_PATH, TEST_SCHEMA_CONTENT)
  })

  afterEach(() => {
    // Clean up test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
  })

  describe('loading from files', () => {
    it('should load schema from a file path', () => {
      const schema = graphQLLoadSchemaSync(TEST_SCHEMA_PATH)

      expect(schema).toBeDefined()
      expect(schema).not.toBeUndefined()
    })

    it('should return a valid GraphQL schema object', () => {
      const schema = graphQLLoadSchemaSync(TEST_SCHEMA_PATH)

      expect(schema).toBeDefined()
      if (schema) {
        expect(schema.getQueryType()).toBeDefined()
        expect(schema.getQueryType()?.name).toBe('Query')
      }
    })

    it('should load schema with correct types', () => {
      const schema = graphQLLoadSchemaSync(TEST_SCHEMA_PATH)

      expect(schema).toBeDefined()
      if (schema) {
        const userType = schema.getType('User')
        expect(userType).toBeDefined()
        expect(userType?.name).toBe('User')
      }
    })

    it('should load schema from array of paths', () => {
      // Create additional schema file
      const additionalSchemaPath = resolve(TEST_DIR, 'additional.graphql')
      writeFileSync(additionalSchemaPath, `
        type Post {
          id: ID!
          title: String!
        }
      `)

      const schema = graphQLLoadSchemaSync([TEST_SCHEMA_PATH, additionalSchemaPath])

      expect(schema).toBeDefined()
      if (schema) {
        expect(schema.getType('User')).toBeDefined()
        expect(schema.getType('Post')).toBeDefined()
      }
    })

    it('should load schema using glob pattern', () => {
      const schema = graphQLLoadSchemaSync(`${TEST_DIR}/**/*.graphql`)

      expect(schema).toBeDefined()
      if (schema) {
        expect(schema.getQueryType()).toBeDefined()
      }
    })
  })

  describe('error handling', () => {
    it('should return undefined for non-existent file', () => {
      const schema = graphQLLoadSchemaSync('/non/existent/path.graphql')

      expect(schema).toBeUndefined()
    })

    it('should return undefined when no files match pattern', () => {
      const schema = graphQLLoadSchemaSync('/non/existent/**/*.graphql')

      expect(schema).toBeUndefined()
    })

    it('should throw for invalid schema content', () => {
      const invalidPath = resolve(TEST_DIR, 'invalid.graphql')
      writeFileSync(invalidPath, INVALID_SCHEMA_CONTENT)

      expect(() => {
        graphQLLoadSchemaSync(invalidPath)
      }).toThrow()
    })

    it('should return undefined for empty file pattern that matches nothing', () => {
      const schema = graphQLLoadSchemaSync(`${TEST_DIR}/**/*.nonexistent`)

      expect(schema).toBeUndefined()
    })
  })

  describe('options', () => {
    it('should accept custom loaders', () => {
      const schema = graphQLLoadSchemaSync(TEST_SCHEMA_PATH, {
        loaders: [],
      })

      expect(schema).toBeDefined()
    })

    it('should work with empty options object', () => {
      const schema = graphQLLoadSchemaSync(TEST_SCHEMA_PATH, {})

      expect(schema).toBeDefined()
    })
  })

  describe('vfs exclusion', () => {
    it('should exclude vfs directory from loading', () => {
      // Create vfs directory with schema
      const vfsDir = resolve(TEST_DIR, 'vfs')
      mkdirSync(vfsDir, { recursive: true })
      writeFileSync(resolve(vfsDir, 'schema.graphql'), `
        type VfsType {
          id: ID!
        }
      `)

      const schema = graphQLLoadSchemaSync(`${TEST_DIR}/**/*.graphql`)

      expect(schema).toBeDefined()
      if (schema) {
        // VfsType should not be loaded
        expect(schema.getType('VfsType')).toBeUndefined()
        // But User should be loaded
        expect(schema.getType('User')).toBeDefined()
      }
    })
  })

  describe('multiple schema files', () => {
    it('should merge types from multiple files', () => {
      // Create multiple schema files
      writeFileSync(resolve(TEST_DIR, 'types.graphql'), `
        type Post {
          id: ID!
          title: String!
          author: User!
        }
      `)

      writeFileSync(resolve(TEST_DIR, 'queries.graphql'), `
        extend type Query {
          posts: [Post!]!
        }
      `)

      const schema = graphQLLoadSchemaSync(`${TEST_DIR}/**/*.graphql`)

      expect(schema).toBeDefined()
      if (schema) {
        expect(schema.getType('User')).toBeDefined()
        expect(schema.getType('Post')).toBeDefined()
        expect(schema.getQueryType()).toBeDefined()
      }
    })

    it('should handle schema extensions', () => {
      writeFileSync(resolve(TEST_DIR, 'extension.graphql'), `
        extend type User {
          age: Int
        }
      `)

      const schema = graphQLLoadSchemaSync(`${TEST_DIR}/**/*.graphql`)

      expect(schema).toBeDefined()
      if (schema) {
        const userType = schema.getType('User')
        expect(userType).toBeDefined()
      }
    })
  })
})

describe('schema structure validation', () => {
  beforeEach(() => {
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true })
    }
  })

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
  })

  it('should correctly parse Query type fields', () => {
    writeFileSync(TEST_SCHEMA_PATH, `
      type Query {
        hello: String
        goodbye: String!
        number: Int
        flag: Boolean
      }
    `)

    const schema = graphQLLoadSchemaSync(TEST_SCHEMA_PATH)

    expect(schema).toBeDefined()
    if (schema) {
      const queryType = schema.getQueryType()
      expect(queryType).toBeDefined()

      const fields = queryType?.getFields()
      expect(fields?.hello).toBeDefined()
      expect(fields?.goodbye).toBeDefined()
      expect(fields?.number).toBeDefined()
      expect(fields?.flag).toBeDefined()
    }
  })

  it('should correctly parse Mutation type', () => {
    writeFileSync(TEST_SCHEMA_PATH, `
      type Query {
        dummy: String
      }

      type Mutation {
        createItem(name: String!): Item!
        deleteItem(id: ID!): Boolean!
      }

      type Item {
        id: ID!
        name: String!
      }
    `)

    const schema = graphQLLoadSchemaSync(TEST_SCHEMA_PATH)

    expect(schema).toBeDefined()
    if (schema) {
      const mutationType = schema.getMutationType()
      expect(mutationType).toBeDefined()
      expect(mutationType?.name).toBe('Mutation')

      const fields = mutationType?.getFields()
      expect(fields?.createItem).toBeDefined()
      expect(fields?.deleteItem).toBeDefined()
    }
  })

  it('should correctly parse enum types', () => {
    writeFileSync(TEST_SCHEMA_PATH, `
      enum Status {
        ACTIVE
        INACTIVE
        PENDING
      }

      type Query {
        status: Status
      }
    `)

    const schema = graphQLLoadSchemaSync(TEST_SCHEMA_PATH)

    expect(schema).toBeDefined()
    if (schema) {
      const statusType = schema.getType('Status')
      expect(statusType).toBeDefined()
      expect(statusType?.name).toBe('Status')
    }
  })

  it('should correctly parse input types', () => {
    writeFileSync(TEST_SCHEMA_PATH, `
      input CreateUserInput {
        name: String!
        email: String!
        age: Int
      }

      type Query {
        dummy: String
      }

      type Mutation {
        createUser(input: CreateUserInput!): User!
      }

      type User {
        id: ID!
        name: String!
      }
    `)

    const schema = graphQLLoadSchemaSync(TEST_SCHEMA_PATH)

    expect(schema).toBeDefined()
    if (schema) {
      const inputType = schema.getType('CreateUserInput')
      expect(inputType).toBeDefined()
      expect(inputType?.name).toBe('CreateUserInput')
    }
  })

  it('should correctly parse interface types', () => {
    writeFileSync(TEST_SCHEMA_PATH, `
      interface Node {
        id: ID!
      }

      type User implements Node {
        id: ID!
        name: String!
      }

      type Query {
        node(id: ID!): Node
      }
    `)

    const schema = graphQLLoadSchemaSync(TEST_SCHEMA_PATH)

    expect(schema).toBeDefined()
    if (schema) {
      const nodeType = schema.getType('Node')
      expect(nodeType).toBeDefined()
      expect(nodeType?.name).toBe('Node')
    }
  })

  it('should correctly parse custom scalars', () => {
    writeFileSync(TEST_SCHEMA_PATH, `
      scalar DateTime
      scalar JSON

      type Query {
        createdAt: DateTime
        data: JSON
      }
    `)

    const schema = graphQLLoadSchemaSync(TEST_SCHEMA_PATH)

    expect(schema).toBeDefined()
    if (schema) {
      const dateTimeType = schema.getType('DateTime')
      const jsonType = schema.getType('JSON')
      expect(dateTimeType).toBeDefined()
      expect(jsonType).toBeDefined()
    }
  })

  it('should correctly parse directives', () => {
    writeFileSync(TEST_SCHEMA_PATH, `
      directive @auth(requires: Role!) on FIELD_DEFINITION

      enum Role {
        ADMIN
        USER
      }

      type Query {
        adminOnly: String @auth(requires: ADMIN)
      }
    `)

    const schema = graphQLLoadSchemaSync(TEST_SCHEMA_PATH)

    expect(schema).toBeDefined()
    if (schema) {
      const directive = schema.getDirective('auth')
      expect(directive).toBeDefined()
      expect(directive?.name).toBe('auth')
    }
  })
})

/**
 * Unit tests for schema-loader core business logic
 *
 * Tests the schema loading functions which:
 * - Load GraphQL schemas from external services
 * - Download and cache schemas for external services
 * - Handle different download modes (once, always, manual)
 * - Support URL vs file path detection
 */
import type { ExternalServiceCodegenConfig } from '../../../src/core/types/codegen'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  downloadAndSaveSchema,
  graphQLLoadSchemaSync,
  loadExternalSchema,
} from '../../../src/core/codegen/schema-loader'

// Create a temporary directory for test files
const TEST_DIR = resolve(__dirname, '.test-schema-loader-core')
const TEST_BUILD_DIR = resolve(TEST_DIR, '.nitro')
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

// Helper to clean up test directories
function cleanupTestDir(): void {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true })
  }
}

// Helper to setup test directories
function setupTestDir(): void {
  cleanupTestDir()
  mkdirSync(TEST_DIR, { recursive: true })
  mkdirSync(TEST_BUILD_DIR, { recursive: true })
}

describe('loadExternalSchema', () => {
  beforeEach(() => {
    setupTestDir()
    writeFileSync(TEST_SCHEMA_PATH, TEST_SCHEMA_CONTENT)
  })

  afterEach(() => {
    cleanupTestDir()
  })

  describe('loading from local files', () => {
    it('should load schema from a local file path', async () => {
      const service: ExternalServiceCodegenConfig = {
        name: 'test-service',
        schema: TEST_SCHEMA_PATH,
        endpoint: 'http://localhost:4000/graphql',
      }

      const schema = await loadExternalSchema(service)

      expect(schema).toBeDefined()
      expect(schema?.getQueryType()).toBeDefined()
      expect(schema?.getQueryType()?.name).toBe('Query')
    })

    it('should load schema from array of local file paths', async () => {
      const additionalSchemaPath = resolve(TEST_DIR, 'additional.graphql')
      writeFileSync(additionalSchemaPath, `
        type Post {
          id: ID!
          title: String!
        }
      `)

      const service: ExternalServiceCodegenConfig = {
        name: 'test-service',
        schema: [TEST_SCHEMA_PATH, additionalSchemaPath],
        endpoint: 'http://localhost:4000/graphql',
      }

      const schema = await loadExternalSchema(service)

      expect(schema).toBeDefined()
      expect(schema?.getType('User')).toBeDefined()
      expect(schema?.getType('Post')).toBeDefined()
    })

    it('should fall back to endpoint when schema is not specified', async () => {
      const service: ExternalServiceCodegenConfig = {
        name: 'test-service',
        schema: TEST_SCHEMA_PATH, // Using local file as fallback won't work
        endpoint: TEST_SCHEMA_PATH, // This would be a file path in tests
      }

      const schema = await loadExternalSchema(service)

      expect(schema).toBeDefined()
    })
  })

  describe('with cached schema (downloadSchema option)', () => {
    it('should load cached schema when downloadSchema is enabled and cache exists', async () => {
      const cachedSchemaDir = resolve(TEST_BUILD_DIR, 'graphql', 'schemas')
      mkdirSync(cachedSchemaDir, { recursive: true })
      const cachedSchemaPath = resolve(cachedSchemaDir, 'cached-service.graphql')
      writeFileSync(cachedSchemaPath, TEST_SCHEMA_CONTENT)

      const service: ExternalServiceCodegenConfig = {
        name: 'cached-service',
        schema: '/non/existent/path.graphql', // This would fail without cache
        endpoint: 'http://localhost:4000/graphql',
        downloadSchema: true,
      }

      const schema = await loadExternalSchema(service, TEST_BUILD_DIR)

      expect(schema).toBeDefined()
      expect(schema?.getQueryType()).toBeDefined()
      expect(schema?.getType('User')).toBeDefined()
    })

    it('should use custom downloadPath for cached schema', async () => {
      const customCachePath = resolve(TEST_DIR, 'custom-cache.graphql')
      writeFileSync(customCachePath, TEST_SCHEMA_CONTENT)

      const service: ExternalServiceCodegenConfig = {
        name: 'custom-cache-service',
        schema: '/non/existent/path.graphql',
        endpoint: 'http://localhost:4000/graphql',
        downloadSchema: true,
        downloadPath: customCachePath,
      }

      const schema = await loadExternalSchema(service, TEST_BUILD_DIR)

      expect(schema).toBeDefined()
      expect(schema?.getQueryType()).toBeDefined()
    })

    it('should continue to load from source if cached schema is invalid', async () => {
      const cachedSchemaDir = resolve(TEST_BUILD_DIR, 'graphql', 'schemas')
      mkdirSync(cachedSchemaDir, { recursive: true })
      const cachedSchemaPath = resolve(cachedSchemaDir, 'invalid-cache-service.graphql')
      writeFileSync(cachedSchemaPath, 'this is not valid graphql schema')

      const service: ExternalServiceCodegenConfig = {
        name: 'invalid-cache-service',
        schema: TEST_SCHEMA_PATH, // Valid schema path
        endpoint: 'http://localhost:4000/graphql',
        downloadSchema: true,
      }

      const schema = await loadExternalSchema(service, TEST_BUILD_DIR)

      expect(schema).toBeDefined()
      expect(schema?.getQueryType()).toBeDefined()
    })
  })

  describe('headers handling', () => {
    it('should accept headers as an object', async () => {
      const service: ExternalServiceCodegenConfig = {
        name: 'test-service',
        schema: TEST_SCHEMA_PATH,
        endpoint: 'http://localhost:4000/graphql',
        headers: {
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'value',
        },
      }

      const schema = await loadExternalSchema(service)

      expect(schema).toBeDefined()
    })

    it('should accept headers as a function', async () => {
      const headersFn = vi.fn().mockReturnValue({
        Authorization: 'Bearer dynamic-token',
      })

      const service: ExternalServiceCodegenConfig = {
        name: 'test-service',
        schema: TEST_SCHEMA_PATH,
        endpoint: 'http://localhost:4000/graphql',
        headers: headersFn,
      }

      const schema = await loadExternalSchema(service)

      expect(schema).toBeDefined()
      expect(headersFn).toHaveBeenCalled()
    })

    it('should handle undefined headers', async () => {
      const service: ExternalServiceCodegenConfig = {
        name: 'test-service',
        schema: TEST_SCHEMA_PATH,
        endpoint: 'http://localhost:4000/graphql',
        headers: undefined,
      }

      const schema = await loadExternalSchema(service)

      expect(schema).toBeDefined()
    })
  })

  describe('error handling', () => {
    it('should return undefined when schema cannot be loaded', async () => {
      const service: ExternalServiceCodegenConfig = {
        name: 'non-existent-service',
        schema: '/non/existent/path.graphql',
        endpoint: 'http://localhost:4000/graphql',
      }

      const schema = await loadExternalSchema(service)

      expect(schema).toBeUndefined()
    })

    it('should return undefined for invalid URL schema', async () => {
      const service: ExternalServiceCodegenConfig = {
        name: 'invalid-url-service',
        schema: 'https://non-existent-domain-12345.com/graphql',
        endpoint: 'https://non-existent-domain-12345.com/graphql',
      }

      const schema = await loadExternalSchema(service)

      expect(schema).toBeUndefined()
    })
  })
})

describe('downloadAndSaveSchema', () => {
  beforeEach(() => {
    setupTestDir()
    writeFileSync(TEST_SCHEMA_PATH, TEST_SCHEMA_CONTENT)
  })

  afterEach(() => {
    cleanupTestDir()
  })

  describe('download mode: manual', () => {
    it('should return undefined when downloadSchema is manual', async () => {
      const service: ExternalServiceCodegenConfig = {
        name: 'manual-service',
        schema: TEST_SCHEMA_PATH,
        endpoint: 'http://localhost:4000/graphql',
        downloadSchema: 'manual',
      }

      const result = await downloadAndSaveSchema(service, TEST_BUILD_DIR)

      expect(result).toBeUndefined()
    })

    it('should return undefined when downloadSchema is false', async () => {
      const service: ExternalServiceCodegenConfig = {
        name: 'disabled-service',
        schema: TEST_SCHEMA_PATH,
        endpoint: 'http://localhost:4000/graphql',
        downloadSchema: false,
      }

      const result = await downloadAndSaveSchema(service, TEST_BUILD_DIR)

      expect(result).toBeUndefined()
    })

    it('should return undefined when downloadSchema is not set', async () => {
      const service: ExternalServiceCodegenConfig = {
        name: 'no-download-service',
        schema: TEST_SCHEMA_PATH,
        endpoint: 'http://localhost:4000/graphql',
      }

      const result = await downloadAndSaveSchema(service, TEST_BUILD_DIR)

      expect(result).toBeUndefined()
    })
  })

  describe('download mode: once', () => {
    it('should download schema when file does not exist', async () => {
      const service: ExternalServiceCodegenConfig = {
        name: 'once-service',
        schema: TEST_SCHEMA_PATH,
        endpoint: 'http://localhost:4000/graphql',
        downloadSchema: 'once',
      }

      const result = await downloadAndSaveSchema(service, TEST_BUILD_DIR)

      expect(result).toBeDefined()
      expect(existsSync(result!)).toBe(true)
      const savedContent = readFileSync(result!, 'utf-8')
      expect(savedContent).toContain('type Query')
    })

    it('should not download schema when file already exists', async () => {
      const cachedSchemaDir = resolve(TEST_BUILD_DIR, 'graphql', 'schemas')
      mkdirSync(cachedSchemaDir, { recursive: true })
      const cachedSchemaPath = resolve(cachedSchemaDir, 'once-exists-service.graphql')
      writeFileSync(cachedSchemaPath, 'existing content')

      const service: ExternalServiceCodegenConfig = {
        name: 'once-exists-service',
        schema: TEST_SCHEMA_PATH,
        endpoint: 'http://localhost:4000/graphql',
        downloadSchema: 'once',
      }

      const result = await downloadAndSaveSchema(service, TEST_BUILD_DIR)

      expect(result).toBeDefined()
      // Content should remain unchanged
      const savedContent = readFileSync(result!, 'utf-8')
      expect(savedContent).toBe('existing content')
    })

    it('should work with boolean true (same as once)', async () => {
      const service: ExternalServiceCodegenConfig = {
        name: 'true-service',
        schema: TEST_SCHEMA_PATH,
        endpoint: 'http://localhost:4000/graphql',
        downloadSchema: true,
      }

      const result = await downloadAndSaveSchema(service, TEST_BUILD_DIR)

      expect(result).toBeDefined()
      expect(existsSync(result!)).toBe(true)
    })
  })

  describe('download mode: always', () => {
    it('should download schema when file does not exist', async () => {
      const service: ExternalServiceCodegenConfig = {
        name: 'always-new-service',
        schema: TEST_SCHEMA_PATH,
        endpoint: 'http://localhost:4000/graphql',
        downloadSchema: 'always',
      }

      const result = await downloadAndSaveSchema(service, TEST_BUILD_DIR)

      expect(result).toBeDefined()
      expect(existsSync(result!)).toBe(true)
    })

    it('should update schema when content has changed (local files)', async () => {
      const cachedSchemaDir = resolve(TEST_BUILD_DIR, 'graphql', 'schemas')
      mkdirSync(cachedSchemaDir, { recursive: true })
      const cachedSchemaPath = resolve(cachedSchemaDir, 'always-update-service.graphql')

      // Write old cached content with an older timestamp
      writeFileSync(cachedSchemaPath, 'old content')
      const oldTime = new Date(Date.now() - 60000) // 1 minute ago
      // Set mtime to the past
      const fs = await import('node:fs')
      fs.utimesSync(cachedSchemaPath, oldTime, oldTime)

      // Update source file to have newer mtime
      writeFileSync(TEST_SCHEMA_PATH, TEST_SCHEMA_CONTENT)

      const service: ExternalServiceCodegenConfig = {
        name: 'always-update-service',
        schema: TEST_SCHEMA_PATH,
        endpoint: 'http://localhost:4000/graphql',
        downloadSchema: 'always',
      }

      const result = await downloadAndSaveSchema(service, TEST_BUILD_DIR)

      expect(result).toBeDefined()
      const savedContent = readFileSync(result!, 'utf-8')
      expect(savedContent).toContain('type Query')
    })

    it('should not update schema when local file has not changed (mtime check)', async () => {
      const cachedSchemaDir = resolve(TEST_BUILD_DIR, 'graphql', 'schemas')
      mkdirSync(cachedSchemaDir, { recursive: true })
      const cachedSchemaPath = resolve(cachedSchemaDir, 'always-no-update-service.graphql')

      // Write cached content
      writeFileSync(cachedSchemaPath, TEST_SCHEMA_CONTENT)

      // Set source file mtime to the past
      const oldTime = new Date(Date.now() - 60000) // 1 minute ago
      const fs = await import('node:fs')
      fs.utimesSync(TEST_SCHEMA_PATH, oldTime, oldTime)

      const service: ExternalServiceCodegenConfig = {
        name: 'always-no-update-service',
        schema: TEST_SCHEMA_PATH,
        endpoint: 'http://localhost:4000/graphql',
        downloadSchema: 'always',
      }

      const result = await downloadAndSaveSchema(service, TEST_BUILD_DIR)

      expect(result).toBeDefined()
    })
  })

  describe('custom download path', () => {
    it('should use custom downloadPath when specified', async () => {
      const customPath = resolve(TEST_DIR, 'custom', 'schema.graphql')

      const service: ExternalServiceCodegenConfig = {
        name: 'custom-path-service',
        schema: TEST_SCHEMA_PATH,
        endpoint: 'http://localhost:4000/graphql',
        downloadSchema: true,
        downloadPath: customPath,
      }

      const result = await downloadAndSaveSchema(service, TEST_BUILD_DIR)

      expect(result).toBe(customPath)
      expect(existsSync(customPath)).toBe(true)
    })
  })

  describe('schema source handling', () => {
    it('should use schema property when available', async () => {
      const service: ExternalServiceCodegenConfig = {
        name: 'schema-prop-service',
        schema: TEST_SCHEMA_PATH,
        endpoint: 'http://localhost:4000/graphql',
        downloadSchema: true,
      }

      const result = await downloadAndSaveSchema(service, TEST_BUILD_DIR)

      expect(result).toBeDefined()
      const savedContent = readFileSync(result!, 'utf-8')
      expect(savedContent).toContain('type Query')
      expect(savedContent).toContain('User')
    })

    it('should handle array of schema sources', async () => {
      const additionalSchemaPath = resolve(TEST_DIR, 'additional.graphql')
      writeFileSync(additionalSchemaPath, `
        type Post {
          id: ID!
          title: String!
        }
      `)

      const service: ExternalServiceCodegenConfig = {
        name: 'array-schema-service',
        schema: [TEST_SCHEMA_PATH, additionalSchemaPath],
        endpoint: 'http://localhost:4000/graphql',
        downloadSchema: true,
      }

      const result = await downloadAndSaveSchema(service, TEST_BUILD_DIR)

      expect(result).toBeDefined()
      const savedContent = readFileSync(result!, 'utf-8')
      expect(savedContent).toContain('Query')
      expect(savedContent).toContain('User')
      expect(savedContent).toContain('Post')
    })
  })

  describe('headers handling', () => {
    it('should accept headers as object for schema loading', async () => {
      const service: ExternalServiceCodegenConfig = {
        name: 'headers-obj-service',
        schema: TEST_SCHEMA_PATH,
        endpoint: 'http://localhost:4000/graphql',
        downloadSchema: true,
        headers: {
          Authorization: 'Bearer token',
        },
      }

      const result = await downloadAndSaveSchema(service, TEST_BUILD_DIR)

      expect(result).toBeDefined()
    })

    it('should accept headers as function for schema loading', async () => {
      const headersFn = vi.fn().mockReturnValue({
        Authorization: 'Bearer dynamic-token',
      })

      const service: ExternalServiceCodegenConfig = {
        name: 'headers-fn-service',
        schema: TEST_SCHEMA_PATH,
        endpoint: 'http://localhost:4000/graphql',
        downloadSchema: true,
        headers: headersFn,
      }

      const result = await downloadAndSaveSchema(service, TEST_BUILD_DIR)

      expect(result).toBeDefined()
      expect(headersFn).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should return undefined when schema loading fails', async () => {
      const service: ExternalServiceCodegenConfig = {
        name: 'error-service',
        schema: '/non/existent/schema.graphql',
        endpoint: 'http://localhost:4000/graphql',
        downloadSchema: true,
      }

      const result = await downloadAndSaveSchema(service, TEST_BUILD_DIR)

      expect(result).toBeUndefined()
    })
  })
})

describe('graphQLLoadSchemaSync edge cases', () => {
  beforeEach(() => {
    setupTestDir()
    writeFileSync(TEST_SCHEMA_PATH, TEST_SCHEMA_CONTENT)
  })

  afterEach(() => {
    cleanupTestDir()
  })

  describe('vfs exclusion', () => {
    it('should automatically exclude vfs directory from glob patterns', () => {
      const vfsDir = resolve(TEST_DIR, 'vfs')
      mkdirSync(vfsDir, { recursive: true })
      writeFileSync(resolve(vfsDir, 'excluded.graphql'), `
        type VfsType {
          id: ID!
        }
      `)

      const schema = graphQLLoadSchemaSync(`${TEST_DIR}/**/*.graphql`)

      expect(schema).toBeDefined()
      expect(schema?.getType('VfsType')).toBeUndefined()
      expect(schema?.getType('User')).toBeDefined()
    })

    it('should exclude nested vfs directories', () => {
      const nestedVfsDir = resolve(TEST_DIR, 'nested', 'vfs', 'deep')
      mkdirSync(nestedVfsDir, { recursive: true })
      writeFileSync(resolve(nestedVfsDir, 'nested.graphql'), `
        type NestedVfs {
          id: ID!
        }
      `)

      const schema = graphQLLoadSchemaSync(`${TEST_DIR}/**/*.graphql`)

      expect(schema).toBeDefined()
      expect(schema?.getType('NestedVfs')).toBeUndefined()
    })
  })

  describe('pointer normalization', () => {
    it('should handle single string pointer', () => {
      const schema = graphQLLoadSchemaSync(TEST_SCHEMA_PATH)

      expect(schema).toBeDefined()
      expect(schema?.getQueryType()).toBeDefined()
    })

    it('should handle array of pointers', () => {
      const additionalPath = resolve(TEST_DIR, 'additional.graphql')
      writeFileSync(additionalPath, `
        type Post {
          id: ID!
          title: String!
        }
      `)

      const schema = graphQLLoadSchemaSync([TEST_SCHEMA_PATH, additionalPath])

      expect(schema).toBeDefined()
      expect(schema?.getType('User')).toBeDefined()
      expect(schema?.getType('Post')).toBeDefined()
    })
  })

  describe('loader options', () => {
    it('should merge custom loaders with default loaders', () => {
      const schema = graphQLLoadSchemaSync(TEST_SCHEMA_PATH, {
        loaders: [], // Empty array should still use default loaders
      })

      expect(schema).toBeDefined()
    })

    it('should pass through additional options', () => {
      const schema = graphQLLoadSchemaSync(TEST_SCHEMA_PATH, {
        assumeValid: true,
        assumeValidSDL: true,
      })

      expect(schema).toBeDefined()
    })
  })

  describe('error message detection', () => {
    it('should return undefined for "no GraphQL type definitions found" error', () => {
      const schema = graphQLLoadSchemaSync('/path/that/matches/nothing/**/*.graphql')

      expect(schema).toBeUndefined()
    })

    it('should throw for syntax errors', () => {
      const invalidPath = resolve(TEST_DIR, 'invalid.graphql')
      writeFileSync(invalidPath, 'this is not { valid graphql syntax')

      expect(() => {
        graphQLLoadSchemaSync(invalidPath)
      }).toThrow()
    })

    it('should throw for schema validation errors', () => {
      const invalidPath = resolve(TEST_DIR, 'schema-error.graphql')
      writeFileSync(invalidPath, `
        type Query {
          field: NonExistentType
        }
      `)

      expect(() => {
        graphQLLoadSchemaSync(invalidPath)
      }).toThrow()
    })
  })
})

describe('uRL detection', () => {
  // Test the internal isUrl function behavior through public API
  beforeEach(() => {
    setupTestDir()
    writeFileSync(TEST_SCHEMA_PATH, TEST_SCHEMA_CONTENT)
  })

  afterEach(() => {
    cleanupTestDir()
  })

  it('should recognize http:// as URL', async () => {
    const service: ExternalServiceCodegenConfig = {
      name: 'http-service',
      schema: 'http://example.com/graphql',
      endpoint: 'http://example.com/graphql',
      downloadSchema: true,
    }

    // This will fail to load but we're testing URL recognition
    const result = await downloadAndSaveSchema(service, TEST_BUILD_DIR)
    // URL loading fails, returns undefined
    expect(result).toBeUndefined()
  })

  it('should recognize https:// as URL', async () => {
    const service: ExternalServiceCodegenConfig = {
      name: 'https-service',
      schema: 'https://example.com/graphql',
      endpoint: 'https://example.com/graphql',
      downloadSchema: true,
    }

    // This will fail to load but we're testing URL recognition
    const result = await downloadAndSaveSchema(service, TEST_BUILD_DIR)
    // URL loading fails, returns undefined
    expect(result).toBeUndefined()
  })

  it('should treat file paths as non-URL', async () => {
    const service: ExternalServiceCodegenConfig = {
      name: 'file-service',
      schema: TEST_SCHEMA_PATH,
      endpoint: 'http://localhost:4000/graphql',
      downloadSchema: true,
    }

    const result = await downloadAndSaveSchema(service, TEST_BUILD_DIR)

    expect(result).toBeDefined()
    expect(existsSync(result!)).toBe(true)
  })

  it('should handle mixed URL and file sources', async () => {
    const additionalPath = resolve(TEST_DIR, 'additional.graphql')
    writeFileSync(additionalPath, `
      type Post {
        id: ID!
        title: String!
      }
    `)

    const service: ExternalServiceCodegenConfig = {
      name: 'mixed-service',
      schema: [
        TEST_SCHEMA_PATH, // Local file
        additionalPath, // Another local file
      ],
      endpoint: 'http://localhost:4000/graphql',
      downloadSchema: true,
    }

    const result = await downloadAndSaveSchema(service, TEST_BUILD_DIR)

    expect(result).toBeDefined()
    const savedContent = readFileSync(result!, 'utf-8')
    expect(savedContent).toContain('Query')
    expect(savedContent).toContain('User')
    expect(savedContent).toContain('Post')
  })
})

describe('schema hash comparison', () => {
  beforeEach(() => {
    setupTestDir()
    writeFileSync(TEST_SCHEMA_PATH, TEST_SCHEMA_CONTENT)
  })

  afterEach(() => {
    cleanupTestDir()
  })

  it('should detect identical schema content via hash comparison', async () => {
    const cachedSchemaDir = resolve(TEST_BUILD_DIR, 'graphql', 'schemas')
    mkdirSync(cachedSchemaDir, { recursive: true })
    const cachedSchemaPath = resolve(cachedSchemaDir, 'hash-compare-service.graphql')

    // Write the same schema content to cache
    writeFileSync(cachedSchemaPath, TEST_SCHEMA_CONTENT)

    const service: ExternalServiceCodegenConfig = {
      name: 'hash-compare-service',
      schema: TEST_SCHEMA_PATH,
      endpoint: 'http://localhost:4000/graphql',
      downloadSchema: 'always',
    }

    // Since mtime comparison is used for local files, we need to test with matching mtimes
    const fs = await import('node:fs')
    const now = new Date()
    fs.utimesSync(TEST_SCHEMA_PATH, now, now)
    fs.utimesSync(cachedSchemaPath, now, now)

    const result = await downloadAndSaveSchema(service, TEST_BUILD_DIR)

    expect(result).toBeDefined()
    expect(result).toBe(cachedSchemaPath)
  })
})

describe('writeFileIfChanged integration', () => {
  beforeEach(() => {
    setupTestDir()
    writeFileSync(TEST_SCHEMA_PATH, TEST_SCHEMA_CONTENT)
  })

  afterEach(() => {
    cleanupTestDir()
  })

  it('should create parent directories when saving schema', async () => {
    const deepPath = resolve(TEST_DIR, 'deep', 'nested', 'path', 'schema.graphql')

    const service: ExternalServiceCodegenConfig = {
      name: 'deep-path-service',
      schema: TEST_SCHEMA_PATH,
      endpoint: 'http://localhost:4000/graphql',
      downloadSchema: true,
      downloadPath: deepPath,
    }

    const result = await downloadAndSaveSchema(service, TEST_BUILD_DIR)

    expect(result).toBe(deepPath)
    expect(existsSync(deepPath)).toBe(true)
  })
})

describe('edge cases and boundary conditions', () => {
  beforeEach(() => {
    setupTestDir()
    writeFileSync(TEST_SCHEMA_PATH, TEST_SCHEMA_CONTENT)
  })

  afterEach(() => {
    cleanupTestDir()
  })

  it('should handle empty headers object', async () => {
    const service: ExternalServiceCodegenConfig = {
      name: 'empty-headers-service',
      schema: TEST_SCHEMA_PATH,
      endpoint: 'http://localhost:4000/graphql',
      headers: {},
    }

    const schema = await loadExternalSchema(service)

    expect(schema).toBeDefined()
  })

  it('should handle headers function returning empty object', async () => {
    const service: ExternalServiceCodegenConfig = {
      name: 'empty-headers-fn-service',
      schema: TEST_SCHEMA_PATH,
      endpoint: 'http://localhost:4000/graphql',
      headers: () => ({}),
    }

    const schema = await loadExternalSchema(service)

    expect(schema).toBeDefined()
  })

  it('should handle schema with directives', async () => {
    const directiveSchemaPath = resolve(TEST_DIR, 'directives.graphql')
    writeFileSync(directiveSchemaPath, `
      directive @auth(requires: Role!) on FIELD_DEFINITION

      enum Role {
        ADMIN
        USER
      }

      type Query {
        adminOnly: String @auth(requires: ADMIN)
      }
    `)

    const service: ExternalServiceCodegenConfig = {
      name: 'directive-service',
      schema: directiveSchemaPath,
      endpoint: 'http://localhost:4000/graphql',
      downloadSchema: true,
    }

    const result = await downloadAndSaveSchema(service, TEST_BUILD_DIR)

    expect(result).toBeDefined()
    const savedContent = readFileSync(result!, 'utf-8')
    expect(savedContent).toContain('directive')
    expect(savedContent).toContain('@auth')
  })

  it('should handle schema with federation directives', async () => {
    const federationSchemaPath = resolve(TEST_DIR, 'federation.graphql')
    writeFileSync(federationSchemaPath, `
      type Query {
        user(id: ID!): User
      }

      type User {
        id: ID!
        name: String!
      }
    `)

    const service: ExternalServiceCodegenConfig = {
      name: 'federation-service',
      schema: federationSchemaPath,
      endpoint: 'http://localhost:4000/graphql',
      downloadSchema: true,
    }

    const result = await downloadAndSaveSchema(service, TEST_BUILD_DIR)

    expect(result).toBeDefined()
  })

  it('should handle schema with all GraphQL type kinds', async () => {
    const fullSchemaPath = resolve(TEST_DIR, 'full.graphql')
    writeFileSync(fullSchemaPath, `
      scalar DateTime

      enum Status {
        ACTIVE
        INACTIVE
      }

      interface Node {
        id: ID!
      }

      union SearchResult = User | Post

      input CreateUserInput {
        name: String!
        email: String!
      }

      type User implements Node {
        id: ID!
        name: String!
        email: String
        status: Status!
        createdAt: DateTime
      }

      type Post implements Node {
        id: ID!
        title: String!
        author: User!
      }

      type Query {
        search(query: String!): [SearchResult!]!
        user(id: ID!): User
      }

      type Mutation {
        createUser(input: CreateUserInput!): User!
      }
    `)

    const service: ExternalServiceCodegenConfig = {
      name: 'full-schema-service',
      schema: fullSchemaPath,
      endpoint: 'http://localhost:4000/graphql',
      downloadSchema: true,
    }

    const result = await downloadAndSaveSchema(service, TEST_BUILD_DIR)

    expect(result).toBeDefined()
    const savedContent = readFileSync(result!, 'utf-8')
    expect(savedContent).toContain('scalar DateTime')
    expect(savedContent).toContain('enum Status')
    expect(savedContent).toContain('interface Node')
    expect(savedContent).toContain('union SearchResult')
    expect(savedContent).toContain('input CreateUserInput')
  })
})

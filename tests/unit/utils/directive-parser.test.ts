/**
 * Unit tests for directive-parser utility module
 *
 * Tests the directive parsing and schema generation utilities:
 * - DirectiveParser: AST-based parsing of defineDirective calls
 * - generateDirectiveSchema: generates GraphQL SDL from parsed directives
 * - generateDirectiveSchemas: generates schemas from multiple directive files
 */
import type { ParsedDirective } from '../../../src/core/utils/directive-parser'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  DirectiveParser,
  generateDirectiveSchema,
  generateDirectiveSchemas,
} from '../../../src/core/utils/directive-parser'

describe('generateDirectiveSchema', () => {
  describe('basic directive generation', () => {
    it('should generate simple directive with single location', () => {
      const directive: ParsedDirective = {
        name: 'upper',
        locations: ['FIELD_DEFINITION'],
      }

      const result = generateDirectiveSchema(directive)

      expect(result).toBe('directive @upper on FIELD_DEFINITION')
    })

    it('should generate directive with multiple locations', () => {
      const directive: ParsedDirective = {
        name: 'auth',
        locations: ['FIELD_DEFINITION', 'OBJECT'],
      }

      const result = generateDirectiveSchema(directive)

      expect(result).toBe('directive @auth on FIELD_DEFINITION | OBJECT')
    })

    it('should generate directive with many locations', () => {
      const directive: ParsedDirective = {
        name: 'everywhere',
        locations: ['QUERY', 'MUTATION', 'SUBSCRIPTION', 'FIELD'],
      }

      const result = generateDirectiveSchema(directive)

      expect(result).toBe('directive @everywhere on QUERY | MUTATION | SUBSCRIPTION | FIELD')
    })
  })

  describe('directives with arguments', () => {
    it('should generate directive with single argument', () => {
      const directive: ParsedDirective = {
        name: 'rateLimit',
        locations: ['FIELD_DEFINITION'],
        args: {
          limit: { type: 'Int!' },
        },
      }

      const result = generateDirectiveSchema(directive)

      expect(result).toBe('directive @rateLimit(limit: Int!) on FIELD_DEFINITION')
    })

    it('should generate directive with multiple arguments', () => {
      const directive: ParsedDirective = {
        name: 'cache',
        locations: ['FIELD_DEFINITION'],
        args: {
          maxAge: { type: 'Int!' },
          scope: { type: 'CacheScope' },
        },
      }

      const result = generateDirectiveSchema(directive)

      expect(result).toBe('directive @cache(maxAge: Int!, scope: CacheScope) on FIELD_DEFINITION')
    })

    it('should generate directive with string default value', () => {
      const directive: ParsedDirective = {
        name: 'deprecated',
        locations: ['FIELD_DEFINITION'],
        args: {
          reason: { type: 'String', defaultValue: 'No longer supported' },
        },
      }

      const result = generateDirectiveSchema(directive)

      expect(result).toBe('directive @deprecated(reason: String = "No longer supported") on FIELD_DEFINITION')
    })

    it('should generate directive with numeric default value', () => {
      const directive: ParsedDirective = {
        name: 'cache',
        locations: ['FIELD_DEFINITION'],
        args: {
          maxAge: { type: 'Int', defaultValue: 60 },
        },
      }

      const result = generateDirectiveSchema(directive)

      expect(result).toBe('directive @cache(maxAge: Int = 60) on FIELD_DEFINITION')
    })

    it('should generate directive with boolean default value', () => {
      const directive: ParsedDirective = {
        name: 'include',
        locations: ['FIELD'],
        args: {
          if: { type: 'Boolean!', defaultValue: true },
        },
      }

      const result = generateDirectiveSchema(directive)

      expect(result).toBe('directive @include(if: Boolean! = true) on FIELD')
    })

    it('should generate directive with false boolean default value', () => {
      const directive: ParsedDirective = {
        name: 'skip',
        locations: ['FIELD'],
        args: {
          if: { type: 'Boolean!', defaultValue: false },
        },
      }

      const result = generateDirectiveSchema(directive)

      expect(result).toBe('directive @skip(if: Boolean! = false) on FIELD')
    })

    it('should generate directive with null default value', () => {
      const directive: ParsedDirective = {
        name: 'nullable',
        locations: ['FIELD_DEFINITION'],
        args: {
          value: { type: 'String', defaultValue: null },
        },
      }

      const result = generateDirectiveSchema(directive)

      expect(result).toBe('directive @nullable(value: String = null) on FIELD_DEFINITION')
    })

    it('should generate directive with zero default value', () => {
      const directive: ParsedDirective = {
        name: 'counter',
        locations: ['FIELD_DEFINITION'],
        args: {
          start: { type: 'Int', defaultValue: 0 },
        },
      }

      const result = generateDirectiveSchema(directive)

      expect(result).toBe('directive @counter(start: Int = 0) on FIELD_DEFINITION')
    })
  })

  describe('directives without arguments', () => {
    it('should not include parentheses when args is undefined', () => {
      const directive: ParsedDirective = {
        name: 'noArgs',
        locations: ['FIELD_DEFINITION'],
      }

      const result = generateDirectiveSchema(directive)

      expect(result).not.toContain('(')
      expect(result).not.toContain(')')
    })

    it('should not include parentheses when args is empty object', () => {
      const directive: ParsedDirective = {
        name: 'emptyArgs',
        locations: ['FIELD_DEFINITION'],
        args: {},
      }

      const result = generateDirectiveSchema(directive)

      expect(result).not.toContain('(')
      expect(result).not.toContain(')')
    })
  })

  describe('edge cases', () => {
    it('should handle directive with empty string name', () => {
      const directive: ParsedDirective = {
        name: '',
        locations: ['FIELD_DEFINITION'],
      }

      const result = generateDirectiveSchema(directive)

      expect(result).toBe('directive @ on FIELD_DEFINITION')
    })

    it('should handle directive with empty locations array', () => {
      const directive: ParsedDirective = {
        name: 'test',
        locations: [],
      }

      const result = generateDirectiveSchema(directive)

      expect(result).toBe('directive @test on ')
    })

    it('should handle mixed argument types with and without defaults', () => {
      const directive: ParsedDirective = {
        name: 'complex',
        locations: ['FIELD_DEFINITION'],
        args: {
          required: { type: 'String!' },
          optional: { type: 'Int', defaultValue: 10 },
          nullable: { type: 'Boolean' },
        },
      }

      const result = generateDirectiveSchema(directive)

      expect(result).toBe('directive @complex(required: String!, optional: Int = 10, nullable: Boolean) on FIELD_DEFINITION')
    })

    it('should handle array type arguments', () => {
      const directive: ParsedDirective = {
        name: 'roles',
        locations: ['FIELD_DEFINITION'],
        args: {
          roles: { type: '[String!]!' },
        },
      }

      const result = generateDirectiveSchema(directive)

      expect(result).toBe('directive @roles(roles: [String!]!) on FIELD_DEFINITION')
    })
  })
})

describe('directiveParser', () => {
  let parser: DirectiveParser

  beforeEach(() => {
    parser = new DirectiveParser()
  })

  describe('parseDirectives', () => {
    it('should parse simple defineDirective call', async () => {
      const content = `
        import { defineDirective } from 'nitro-graphql/define'

        export const upperDirective = defineDirective({
          name: 'upper',
          locations: ['FIELD_DEFINITION'],
        })
      `

      const result = await parser.parseDirectives(content, 'test.ts')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('upper')
      expect(result[0].locations).toEqual(['FIELD_DEFINITION'])
    })

    it('should parse defineDirective with multiple locations', async () => {
      const content = `
        export const authDirective = defineDirective({
          name: 'auth',
          locations: ['FIELD_DEFINITION', 'OBJECT'],
        })
      `

      const result = await parser.parseDirectives(content, 'test.ts')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('auth')
      expect(result[0].locations).toEqual(['FIELD_DEFINITION', 'OBJECT'])
    })

    it('should parse defineDirective with arguments', async () => {
      const content = `
        export const rateLimitDirective = defineDirective({
          name: 'rateLimit',
          locations: ['FIELD_DEFINITION'],
          args: {
            limit: { type: 'Int!' },
            duration: { type: 'Int!' },
          },
        })
      `

      const result = await parser.parseDirectives(content, 'test.ts')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('rateLimit')
      expect(result[0].args).toEqual({
        limit: { type: 'Int!' },
        duration: { type: 'Int!' },
      })
    })

    it('should parse defineDirective with default values', async () => {
      const content = `
        export const cacheDirective = defineDirective({
          name: 'cache',
          locations: ['FIELD_DEFINITION'],
          args: {
            maxAge: { type: 'Int', defaultValue: 60 },
          },
        })
      `

      const result = await parser.parseDirectives(content, 'test.ts')

      expect(result).toHaveLength(1)
      expect(result[0].args).toEqual({
        maxAge: { type: 'Int', defaultValue: 60 },
      })
    })

    it('should parse defineDirective with string default value', async () => {
      const content = `
        export const deprecatedDirective = defineDirective({
          name: 'deprecated',
          locations: ['FIELD_DEFINITION'],
          args: {
            reason: { type: 'String', defaultValue: 'No longer supported' },
          },
        })
      `

      const result = await parser.parseDirectives(content, 'test.ts')

      expect(result).toHaveLength(1)
      expect(result[0].args).toEqual({
        reason: { type: 'String', defaultValue: 'No longer supported' },
      })
    })

    it('should parse defineDirective with boolean default value', async () => {
      const content = `
        export const includeDirective = defineDirective({
          name: 'include',
          locations: ['FIELD'],
          args: {
            if: { type: 'Boolean!', defaultValue: true },
          },
        })
      `

      const result = await parser.parseDirectives(content, 'test.ts')

      expect(result).toHaveLength(1)
      expect(result[0].args).toEqual({
        if: { type: 'Boolean!', defaultValue: true },
      })
    })

    it('should parse defineDirective with description', async () => {
      const content = `
        export const docDirective = defineDirective({
          name: 'doc',
          description: 'Documents a field',
          locations: ['FIELD_DEFINITION'],
        })
      `

      const result = await parser.parseDirectives(content, 'test.ts')

      expect(result).toHaveLength(1)
      expect(result[0].description).toBe('Documents a field')
    })

    it('should parse defineDirective with isRepeatable', async () => {
      const content = `
        export const tagDirective = defineDirective({
          name: 'tag',
          locations: ['FIELD_DEFINITION'],
          isRepeatable: true,
        })
      `

      const result = await parser.parseDirectives(content, 'test.ts')

      expect(result).toHaveLength(1)
      expect(result[0].isRepeatable).toBe(true)
    })

    it('should parse multiple defineDirective calls in same file', async () => {
      const content = `
        export const upperDirective = defineDirective({
          name: 'upper',
          locations: ['FIELD_DEFINITION'],
        })

        export const lowerDirective = defineDirective({
          name: 'lower',
          locations: ['FIELD_DEFINITION'],
        })
      `

      const result = await parser.parseDirectives(content, 'test.ts')

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('upper')
      expect(result[1].name).toBe('lower')
    })

    it('should return empty array for file without defineDirective', async () => {
      const content = `
        export const myQuery = defineQuery({
          users: () => [],
        })
      `

      const result = await parser.parseDirectives(content, 'test.ts')

      expect(result).toHaveLength(0)
    })

    it('should return empty array for invalid syntax', async () => {
      const content = `
        export const invalid = {{{
      `

      const result = await parser.parseDirectives(content, 'test.ts')

      expect(result).toHaveLength(0)
    })

    it('should return null for defineDirective without name', async () => {
      const content = `
        export const noNameDirective = defineDirective({
          locations: ['FIELD_DEFINITION'],
        })
      `

      const result = await parser.parseDirectives(content, 'test.ts')

      // Should not return a directive without name
      expect(result).toHaveLength(0)
    })

    it('should return null for defineDirective without locations', async () => {
      const content = `
        export const noLocationsDirective = defineDirective({
          name: 'test',
        })
      `

      const result = await parser.parseDirectives(content, 'test.ts')

      // Should not return a directive without locations
      expect(result).toHaveLength(0)
    })

    it('should handle JavaScript files', async () => {
      const content = `
        export const jsDirective = defineDirective({
          name: 'js',
          locations: ['FIELD_DEFINITION'],
        })
      `

      const result = await parser.parseDirectives(content, 'test.js')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('js')
    })

    it('should ignore non-defineDirective calls', async () => {
      const content = `
        import { defineDirective, defineQuery } from 'nitro-graphql/define'

        export const someQuery = defineQuery({
          name: 'query',
        })

        export const myDirective = defineDirective({
          name: 'real',
          locations: ['FIELD_DEFINITION'],
        })

        export const someResolver = defineResolver({
          name: 'resolver',
        })
      `

      const result = await parser.parseDirectives(content, 'test.ts')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('real')
    })
  })
})

describe('generateDirectiveSchemas', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'directive-test-'))
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('should return null for empty directive array', async () => {
    const result = await generateDirectiveSchemas([])

    expect(result).toBeNull()
  })

  it('should generate schema from single directive file', async () => {
    const filePath = path.join(tempDir, 'upper.directive.ts')
    const content = `
      export const upperDirective = defineDirective({
        name: 'upper',
        locations: ['FIELD_DEFINITION'],
      })
    `
    fs.writeFileSync(filePath, content)

    const result = await generateDirectiveSchemas([{ fullPath: filePath }])

    expect(result).toBe('directive @upper on FIELD_DEFINITION')
  })

  it('should generate schemas from multiple directive files', async () => {
    const upperPath = path.join(tempDir, 'upper.directive.ts')
    const lowerPath = path.join(tempDir, 'lower.directive.ts')

    fs.writeFileSync(upperPath, `
      export const upperDirective = defineDirective({
        name: 'upper',
        locations: ['FIELD_DEFINITION'],
      })
    `)
    fs.writeFileSync(lowerPath, `
      export const lowerDirective = defineDirective({
        name: 'lower',
        locations: ['FIELD_DEFINITION'],
      })
    `)

    const result = await generateDirectiveSchemas([
      { fullPath: upperPath },
      { fullPath: lowerPath },
    ])

    expect(result).toContain('directive @upper on FIELD_DEFINITION')
    expect(result).toContain('directive @lower on FIELD_DEFINITION')
  })

  it('should deduplicate directives by name (first wins)', async () => {
    const firstPath = path.join(tempDir, 'first.directive.ts')
    const secondPath = path.join(tempDir, 'second.directive.ts')

    fs.writeFileSync(firstPath, `
      export const authDirective = defineDirective({
        name: 'auth',
        locations: ['FIELD_DEFINITION'],
      })
    `)
    fs.writeFileSync(secondPath, `
      export const authDirective = defineDirective({
        name: 'auth',
        locations: ['OBJECT', 'INTERFACE'],
      })
    `)

    const result = await generateDirectiveSchemas([
      { fullPath: firstPath },
      { fullPath: secondPath },
    ])

    // Should only have FIELD_DEFINITION (from first file)
    expect(result).toBe('directive @auth on FIELD_DEFINITION')
    expect(result).not.toContain('OBJECT')
  })

  it('should handle specifier format for directive refs', async () => {
    const filePath = path.join(tempDir, 'spec.directive.ts')
    const content = `
      export const specDirective = defineDirective({
        name: 'spec',
        locations: ['FIELD_DEFINITION'],
      })
    `
    fs.writeFileSync(filePath, content)

    const result = await generateDirectiveSchemas([{ specifier: filePath }])

    expect(result).toBe('directive @spec on FIELD_DEFINITION')
  })

  it('should write to buildDir when provided', async () => {
    const filePath = path.join(tempDir, 'write.directive.ts')
    const buildDir = path.join(tempDir, 'build')

    fs.writeFileSync(filePath, `
      export const writeDirective = defineDirective({
        name: 'write',
        locations: ['FIELD_DEFINITION'],
      })
    `)

    await generateDirectiveSchemas([{ fullPath: filePath }], buildDir)

    const outputPath = path.join(buildDir, 'directives.graphql')
    expect(fs.existsSync(outputPath)).toBe(true)

    const writtenContent = fs.readFileSync(outputPath, 'utf-8')
    expect(writtenContent).toBe('directive @write on FIELD_DEFINITION')
  })

  it('should create buildDir if it does not exist', async () => {
    const filePath = path.join(tempDir, 'create.directive.ts')
    const buildDir = path.join(tempDir, 'nested', 'build', 'dir')

    fs.writeFileSync(filePath, `
      export const createDirective = defineDirective({
        name: 'create',
        locations: ['FIELD_DEFINITION'],
      })
    `)

    await generateDirectiveSchemas([{ fullPath: filePath }], buildDir)

    expect(fs.existsSync(buildDir)).toBe(true)
    expect(fs.existsSync(path.join(buildDir, 'directives.graphql'))).toBe(true)
  })

  it('should not write if content unchanged', async () => {
    const filePath = path.join(tempDir, 'unchanged.directive.ts')
    const buildDir = path.join(tempDir, 'build')

    fs.writeFileSync(filePath, `
      export const unchangedDirective = defineDirective({
        name: 'unchanged',
        locations: ['FIELD_DEFINITION'],
      })
    `)

    // First write
    await generateDirectiveSchemas([{ fullPath: filePath }], buildDir)
    const outputPath = path.join(buildDir, 'directives.graphql')
    const firstMtime = fs.statSync(outputPath).mtimeMs

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 10))

    // Second write with same content
    await generateDirectiveSchemas([{ fullPath: filePath }], buildDir)
    const secondMtime = fs.statSync(outputPath).mtimeMs

    // File should not have been rewritten
    expect(secondMtime).toBe(firstMtime)
  })

  it('should continue on parse errors for individual files', async () => {
    const validPath = path.join(tempDir, 'valid.directive.ts')
    const invalidPath = path.join(tempDir, 'invalid.directive.ts')

    fs.writeFileSync(validPath, `
      export const validDirective = defineDirective({
        name: 'valid',
        locations: ['FIELD_DEFINITION'],
      })
    `)
    fs.writeFileSync(invalidPath, `
      export const invalid = {{{
    `)

    const result = await generateDirectiveSchemas([
      { fullPath: invalidPath },
      { fullPath: validPath },
    ])

    // Should still parse the valid file
    expect(result).toBe('directive @valid on FIELD_DEFINITION')
  })

  it('should continue if file does not exist', async () => {
    const validPath = path.join(tempDir, 'exists.directive.ts')
    const missingPath = path.join(tempDir, 'missing.directive.ts')

    fs.writeFileSync(validPath, `
      export const existsDirective = defineDirective({
        name: 'exists',
        locations: ['FIELD_DEFINITION'],
      })
    `)

    const result = await generateDirectiveSchemas([
      { fullPath: missingPath },
      { fullPath: validPath },
    ])

    expect(result).toBe('directive @exists on FIELD_DEFINITION')
  })

  it('should return null when all files fail to parse', async () => {
    const invalidPath = path.join(tempDir, 'invalid.directive.ts')
    fs.writeFileSync(invalidPath, `export const x = {{{`)

    const result = await generateDirectiveSchemas([{ fullPath: invalidPath }])

    expect(result).toBeNull()
  })

  it('should return null when files have no valid directives', async () => {
    const noDirectivePath = path.join(tempDir, 'no-directive.ts')
    fs.writeFileSync(noDirectivePath, `
      export const query = defineQuery({
        users: () => [],
      })
    `)

    const result = await generateDirectiveSchemas([{ fullPath: noDirectivePath }])

    expect(result).toBeNull()
  })

  it('should handle directive with complex arguments', async () => {
    const filePath = path.join(tempDir, 'complex.directive.ts')
    fs.writeFileSync(filePath, `
      export const complexDirective = defineDirective({
        name: 'complex',
        locations: ['FIELD_DEFINITION', 'OBJECT'],
        args: {
          required: { type: 'String!' },
          optional: { type: 'Int', defaultValue: 42 },
        },
      })
    `)

    const result = await generateDirectiveSchemas([{ fullPath: filePath }])

    expect(result).toBe('directive @complex(required: String!, optional: Int = 42) on FIELD_DEFINITION | OBJECT')
  })
})

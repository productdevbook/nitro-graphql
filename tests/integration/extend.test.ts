/**
 * Integration tests for extend functionality
 *
 * Tests that config.ts, schema.ts, resolvers, directives, and GraphQL schemas
 * are properly merged from extended packages.
 *
 * Fixture structure:
 * - main-project/         → Main project that extends another package
 *   └── server/graphql/
 *       ├── schema.graphql
 *       └── rate-limit.directive.ts
 *
 * - extend-pkg/           → Package being extended
 *   ├── nitro-graphql.config.ts
 *   └── server/graphql/
 *       ├── config.ts       → GraphQL server config (merged with defu)
 *       ├── schema.ts       → Validation schemas (merged with spread)
 *       ├── schema.graphql  → GraphQL schema (merged)
 *       ├── hello.resolver.ts
 *       └── auth.directive.ts
 */
import type { Nitro } from 'nitro/types'
import { createNitro, prepare } from 'nitro/builder'
import { resolve } from 'pathe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import graphql from '../../src'

const fixturesDir = resolve(__dirname, '../fixtures')

describe('extend integration', () => {
  let nitro: Nitro

  beforeAll(async () => {
    nitro = await createNitro({
      rootDir: resolve(fixturesDir, 'main-project'),
      dev: true,
      modules: [
        graphql({
          framework: 'graphql-yoga',
          extend: [resolve(fixturesDir, 'extend-pkg')],
          // Disable type generation in tests to avoid graphql module conflicts
          types: { enabled: false },
        }),
      ],
    })

    await prepare(nitro)
  }, 30000)

  afterAll(async () => {
    if (nitro) {
      await nitro.close()
    }
  })

  describe('config.ts merge', () => {
    it('should collect extend configs', () => {
      expect(nitro.graphql.extendConfigs).toBeDefined()
      expect(Array.isArray(nitro.graphql.extendConfigs)).toBe(true)
    })

    it('should have extend config from fixture', () => {
      expect(nitro.graphql.extendConfigs.length).toBe(1)
      expect(nitro.graphql.extendConfigs[0]).toContain('extend-pkg')
      expect(nitro.graphql.extendConfigs[0]).toContain('config.ts')
    })
  })

  describe('schema.ts merge', () => {
    it('should collect extend schemas', () => {
      expect(nitro.graphql.extendSchemas).toBeDefined()
      expect(Array.isArray(nitro.graphql.extendSchemas)).toBe(true)
    })

    it('should have extend schema from fixture', () => {
      expect(nitro.graphql.extendSchemas.length).toBe(1)
      expect(nitro.graphql.extendSchemas[0]).toContain('extend-pkg')
      expect(nitro.graphql.extendSchemas[0]).toContain('schema.ts')
    })
  })

  describe('resolvers merge', () => {
    it('should have resolvers from extends', () => {
      expect(nitro.scanResolvers.length).toBeGreaterThan(0)
    })

    it('should include resolver from extend-pkg', () => {
      const hasExtendResolver = nitro.scanResolvers.some(
        (r: { specifier: string }) => r.specifier.includes('extend-pkg'),
      )
      expect(hasExtendResolver).toBe(true)
    })
  })

  describe('graphql schemas merge', () => {
    it('should have schemas from both local and extends', () => {
      expect(nitro.scanSchemas.length).toBe(2)
    })

    it('should include schema from extend-pkg', () => {
      const hasExtendSchema = nitro.scanSchemas.some(
        (s: string) => s.includes('extend-pkg'),
      )
      expect(hasExtendSchema).toBe(true)
    })

    it('should include local schema', () => {
      const hasLocalSchema = nitro.scanSchemas.some(
        (s: string) => s.includes('main-project'),
      )
      expect(hasLocalSchema).toBe(true)
    })
  })

  describe('directives merge', () => {
    it('should collect directives from both local and extends', () => {
      expect(nitro.scanDirectives).toBeDefined()
      expect(Array.isArray(nitro.scanDirectives)).toBe(true)
      // Should have directives from both: main-project (rateLimit) + extend-pkg (requireAuth)
      expect(nitro.scanDirectives.length).toBeGreaterThanOrEqual(2)
    })

    it('should include directive from extend-pkg', () => {
      const extendDirective = nitro.scanDirectives.find(
        (d: { specifier: string }) => d.specifier.includes('extend-pkg'),
      )
      expect(extendDirective).toBeDefined()
      expect(extendDirective!.specifier).toContain('auth.directive.ts')
    })

    it('should include local directive from main-project', () => {
      const localDirective = nitro.scanDirectives.find(
        (d: { specifier: string }) => d.specifier.includes('main-project'),
      )
      expect(localDirective).toBeDefined()
      expect(localDirective!.specifier).toContain('rate-limit.directive.ts')
    })

    it('should parse directive exports correctly', () => {
      const extendDirective = nitro.scanDirectives.find(
        (d: { specifier: string }) => d.specifier.includes('extend-pkg'),
      )
      expect(extendDirective).toBeDefined()
      expect(extendDirective!.imports).toBeDefined()
      expect(extendDirective!.imports.length).toBeGreaterThan(0)
      expect(extendDirective!.imports[0].type).toBe('directive')
    })

    it('should include directive with transformer', () => {
      // upper.directive.ts has a transformer function
      const upperDirective = nitro.scanDirectives.find(
        (d: { specifier: string }) => d.specifier.includes('upper.directive'),
      )
      expect(upperDirective).toBeDefined()
      expect(upperDirective!.specifier).toContain('extend-pkg')
    })
  })
})

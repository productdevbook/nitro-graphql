import { describe, expect, it } from 'vitest'
import {
  DEFINE_FUNCTIONS,
  FRAMEWORK_NITRO,
  FRAMEWORK_NUXT,
  GRAPHQL_EXTENSIONS,
  RESOLVER_EXTENSIONS,
} from '../../src/constants'

describe('constants', () => {
  it('should export GraphQL extensions', () => {
    expect(GRAPHQL_EXTENSIONS).toEqual(['.graphql', '.gql'])
  })

  it('should export resolver extensions', () => {
    expect(RESOLVER_EXTENSIONS).toEqual(['.resolver.ts', '.resolver.js'])
  })

  it('should export framework identifiers', () => {
    expect(FRAMEWORK_NUXT).toBe('nuxt')
    expect(FRAMEWORK_NITRO).toBe('nitro')
  })

  it('should export all define functions', () => {
    expect(DEFINE_FUNCTIONS).toHaveLength(6)
    expect(DEFINE_FUNCTIONS).toContain('defineResolver')
    expect(DEFINE_FUNCTIONS).toContain('defineQuery')
    expect(DEFINE_FUNCTIONS).toContain('defineMutation')
  })
})

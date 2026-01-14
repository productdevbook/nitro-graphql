import { describe, expect, it } from 'vitest'
import { validateExternalServices } from '../../../src/core/validation/external-services'

describe('validation/external-services', () => {
  describe('validateExternalServices', () => {
    it('should return no errors for empty array', () => {
      const errors = validateExternalServices([])
      expect(errors).toEqual([])
    })

    it('should return no errors for valid configuration', () => {
      const errors = validateExternalServices([
        {
          name: 'github',
          endpoint: 'https://api.github.com/graphql',
        },
      ])
      expect(errors).toEqual([])
    })

    it('should return no errors when schema is provided', () => {
      const errors = validateExternalServices([
        {
          name: 'github',
          endpoint: 'https://api.github.com/graphql',
          schema: 'https://api.github.com/graphql',
        },
      ])
      expect(errors).toEqual([])
    })

    it('should return no errors when schema is omitted (uses endpoint for introspection)', () => {
      const errors = validateExternalServices([
        {
          name: 'ecommerce',
          endpoint: 'http://localhost:3123/api/graphql',
          downloadPath: './ecommerce.graphql',
          downloadSchema: 'always',
          documents: ['app/graphql/ecommerce/**/*.gql'],
        },
      ])
      expect(errors).toEqual([])
    })

    it('should return error if service is not an object', () => {
      const errors = validateExternalServices([null, 'invalid', 123, undefined])
      expect(errors).toContain('externalServices[0] must be an object')
      expect(errors).toContain('externalServices[1] must be an object')
      expect(errors).toContain('externalServices[2] must be an object')
      expect(errors).toContain('externalServices[3] must be an object')
    })

    it('should return error if name is missing', () => {
      const errors = validateExternalServices([
        {
          endpoint: 'https://api.github.com/graphql',
        },
      ])
      expect(errors).toContain('externalServices[0].name is required and must be a string')
    })

    it('should return error if name is not a string', () => {
      const errors = validateExternalServices([
        {
          name: 123,
          endpoint: 'https://api.github.com/graphql',
        },
      ])
      expect(errors).toContain('externalServices[0].name is required and must be a string')
    })

    it('should return error if name is empty string', () => {
      const errors = validateExternalServices([
        {
          name: '',
          endpoint: 'https://api.github.com/graphql',
        },
      ])
      expect(errors).toContain('externalServices[0].name "" must be a valid identifier (letters, numbers, underscore, starting with letter)')
    })

    it('should return error for duplicate names', () => {
      const errors = validateExternalServices([
        {
          name: 'github',
          endpoint: 'https://api.github.com/graphql',
        },
        {
          name: 'github',
          endpoint: 'https://api.github.com/graphql2',
        },
      ])
      expect(errors).toContain('externalServices[1].name "github" must be unique')
    })

    it('should return error if endpoint is missing', () => {
      const errors = validateExternalServices([
        {
          name: 'github',
        },
      ])
      expect(errors).toContain('externalServices[0].endpoint is required and must be a string')
    })

    it('should return error if endpoint is not a string', () => {
      const errors = validateExternalServices([
        {
          name: 'github',
          endpoint: 123,
        },
      ])
      expect(errors).toContain('externalServices[0].endpoint is required and must be a string')
    })

    it('should return error if endpoint is not a valid URL', () => {
      const errors = validateExternalServices([
        {
          name: 'github',
          endpoint: 'not-a-url',
        },
      ])
      expect(errors).toContain('externalServices[0].endpoint "not-a-url" must be a valid URL')
    })

    it('should return error if endpoint is empty string', () => {
      const errors = validateExternalServices([
        {
          name: 'github',
          endpoint: '',
        },
      ])
      expect(errors).toContain('externalServices[0].endpoint "" must be a valid URL')
    })

    it('should return error if name is not a valid identifier', () => {
      const errors = validateExternalServices([
        {
          name: '123invalid',
          endpoint: 'https://api.github.com/graphql',
        },
      ])
      expect(errors).toContain('externalServices[0].name "123invalid" must be a valid identifier (letters, numbers, underscore, starting with letter)')
    })

    it('should return error for names with special characters', () => {
      const errors = validateExternalServices([
        {
          name: 'my-service',
          endpoint: 'https://api.example.com/graphql',
        },
      ])
      expect(errors).toContain('externalServices[0].name "my-service" must be a valid identifier (letters, numbers, underscore, starting with letter)')
    })

    it('should allow names with underscores', () => {
      const errors = validateExternalServices([
        {
          name: 'my_service',
          endpoint: 'https://api.example.com/graphql',
        },
      ])
      expect(errors).toEqual([])
    })

    it('should allow names starting with uppercase', () => {
      const errors = validateExternalServices([
        {
          name: 'GitHub',
          endpoint: 'https://api.github.com/graphql',
        },
      ])
      expect(errors).toEqual([])
    })

    it('should return multiple errors for multiple invalid services', () => {
      const errors = validateExternalServices([
        {
          name: 'valid',
          endpoint: 'https://api.example.com/graphql',
        },
        {
          endpoint: 'not-a-url',
        },
        {
          name: '123bad',
          endpoint: 'https://api.example.com/graphql',
        },
      ])
      expect(errors).toContain('externalServices[1].name is required and must be a string')
      expect(errors).toContain('externalServices[1].endpoint "not-a-url" must be a valid URL')
      expect(errors).toContain('externalServices[2].name "123bad" must be a valid identifier (letters, numbers, underscore, starting with letter)')
    })

    it('should accept http URLs', () => {
      const errors = validateExternalServices([
        {
          name: 'local',
          endpoint: 'http://localhost:3000/graphql',
        },
      ])
      expect(errors).toEqual([])
    })

    it('should accept URLs with ports', () => {
      const errors = validateExternalServices([
        {
          name: 'local',
          endpoint: 'https://localhost:8080/graphql',
        },
      ])
      expect(errors).toEqual([])
    })
  })
})

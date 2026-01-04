/**
 * Fixture: Directive file that uses other define* functions
 * Only defineDirective should match in directive scanning
 */
import { defineDirective, defineQuery } from 'nitro-graphql/define'

// This should NOT be detected by directive scanner (wrong function)
export const myQuery = defineQuery({
  hello: () => 'Hello',
} as any)

// This SHOULD be detected by directive scanner
export const cacheDirective = defineDirective({
  name: 'cache',
  locations: ['FIELD_DEFINITION'],
})

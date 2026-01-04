/**
 * Fixture: Valid directive file
 * Tests parsing of defineDirective calls
 */
import { defineDirective } from 'nitro-graphql/define'

export const upperDirective = defineDirective({
  name: 'upper',
  locations: ['FIELD_DEFINITION'],
})

export const authDirective = defineDirective({
  name: 'auth',
  locations: ['FIELD_DEFINITION', 'OBJECT'],
})

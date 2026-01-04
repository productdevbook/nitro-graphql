/**
 * Fixture: Directive file with mixed exports (define and non-define)
 * Only defineDirective exports should be detected
 */
import { defineDirective } from 'nitro-graphql/define'

// This should be detected
export const logDirective = defineDirective({
  name: 'log',
  locations: ['FIELD_DEFINITION'],
})

// These should NOT be detected (not using defineDirective)
export const someHelper = () => 'helper'

export const someConfig = {
  enabled: true,
}

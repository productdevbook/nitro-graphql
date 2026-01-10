import { bench, describe } from 'vitest'
import { DirectiveParser, generateDirectiveSchema } from '../src/core/utils/directive-parser'

const sampleDirectiveFile = `
import { defineDirective } from 'nitro-graphql/define'

export default defineDirective({
  name: 'auth',
  locations: ['FIELD_DEFINITION', 'OBJECT'],
  args: {
    requires: {
      type: 'String',
      defaultValue: 'USER'
    }
  },
  description: 'Checks if user has required permission'
})
`

const complexDirectiveFile = `
import { defineDirective } from 'nitro-graphql/define'

export const cacheDirective = defineDirective({
  name: 'cache',
  locations: ['FIELD_DEFINITION'],
  args: {
    ttl: { type: 'Int', defaultValue: 300 },
    scope: { type: 'String', defaultValue: 'PUBLIC' }
  },
  description: 'Cache field results',
  isRepeatable: false
})

export const ratelimitDirective = defineDirective({
  name: 'ratelimit',
  locations: ['FIELD_DEFINITION', 'OBJECT'],
  args: {
    limit: { type: 'Int' },
    window: { type: 'Int', defaultValue: 60 }
  },
  description: 'Rate limit requests'
})
`

describe('directive Parser Performance', () => {
  const parser = new DirectiveParser()

  bench('parse single directive', async () => {
    await parser.parseDirectives(sampleDirectiveFile, 'directive.ts')
  })

  bench('parse multiple directives', async () => {
    await parser.parseDirectives(complexDirectiveFile, 'directives.ts')
  })

  bench('generate directive schema', () => {
    const directive = {
      name: 'auth',
      locations: ['FIELD_DEFINITION', 'OBJECT'],
      args: {
        requires: {
          type: 'String',
          defaultValue: 'USER',
        },
      },
      description: 'Checks if user has required permission',
    }
    generateDirectiveSchema(directive)
  })
})

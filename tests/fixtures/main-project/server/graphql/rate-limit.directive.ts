import { defineDirective } from 'nitro-graphql/define'

export const rateLimitDirective = defineDirective({
  name: 'rateLimit',
  locations: ['FIELD_DEFINITION'],
  args: {
    limit: { type: 'Int!' },
    duration: { type: 'Int!' },
  },
})

import { defineDirective } from 'nitro-graphql/define'

export const authDirective = defineDirective({
  name: 'requireAuth',
  locations: ['FIELD_DEFINITION'],
})

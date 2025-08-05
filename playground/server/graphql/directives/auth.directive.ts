import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils'
import { defaultFieldResolver, GraphQLError } from 'graphql'

export const authDirective = defineDirective({
  name: 'auth',
  locations: ['FIELD_DEFINITION', 'OBJECT', 'ARGUMENT_DEFINITION'],
  args: {
    requires: {
      type: 'String',
      defaultValue: 'USER',
      description: 'Required role to access this field',
    },
  },
  description: 'Directive to check authentication and authorization',
  transformer: (schema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const authDirectiveConfig = getDirective(schema, fieldConfig, 'auth')?.[0]

        if (authDirectiveConfig) {
          const { requires: requiredRole } = authDirectiveConfig
          const { resolve = defaultFieldResolver } = fieldConfig

          fieldConfig.resolve = async function (source, args, context, info) {
            // Example authentication check
            if (!context.user) {
              throw new GraphQLError('You must be logged in to access this field', {
                extensions: {
                  code: 'UNAUTHENTICATED',
                },
              })
            }

            // Example authorization check
            if (requiredRole && context.user.role !== requiredRole) {
              throw new GraphQLError(`You must have ${requiredRole} role to access this field`, {
                extensions: {
                  code: 'FORBIDDEN',
                },
              })
            }

            return resolve(source, args, context, info)
          }
        }

        return fieldConfig
      },
    })
  },
})

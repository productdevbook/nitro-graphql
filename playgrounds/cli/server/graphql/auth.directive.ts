import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils'
import { defaultFieldResolver, GraphQLError } from 'graphql'
import { defineDirective } from 'nitro-graphql/define'

export const authDirective = defineDirective({
  name: 'authBBB',
  locations: ['FIELD_DEFINITION'],
  args: {
    requires: {
      type: 'String',
      defaultValue: 'USER',
      description: 'Required role to access this field',
    },
  },
  description: 'Directive to check authentication',
  transformer: (schema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const authDirectiveConfig = getDirective(schema, fieldConfig, 'auth')?.[0]

        if (authDirectiveConfig) {
          const { resolve = defaultFieldResolver } = fieldConfig

          fieldConfig.resolve = async function (source, args, context, info) {
            const { auth } = context
            const user = auth?.user

            if (!user?.id) {
              throw new GraphQLError('You must be logged in to access this field', {
                extensions: {
                  code: 'UNAUTHENTICATED',
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

export const hasRoleDirective = defineDirective({
  name: 'hasRole',
  locations: ['FIELD_DEFINITION'],
  args: {
    role: {
      type: 'String!',
      description: 'Required role to access this field',
    },
  },
  description: 'Directive to check user role authorization',
  transformer: (schema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const hasRoleDirectiveConfig = getDirective(schema, fieldConfig, 'hasRole')?.[0]

        if (hasRoleDirectiveConfig) {
          const { role: requiredRole } = hasRoleDirectiveConfig
          const { resolve = defaultFieldResolver } = fieldConfig

          fieldConfig.resolve = async function (source, args, context, info) {
            const { auth } = context
            const user = auth?.user

            if (!user?.id) {
              throw new GraphQLError('You must be logged in to access this field', {
                extensions: {
                  code: 'UNAUTHENTICATED',
                },
              })
            }

            const userRole = context.userRole

            if (!userRole || userRole !== requiredRole) {
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

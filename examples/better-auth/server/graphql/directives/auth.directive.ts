import type { H3EventContext } from 'h3'
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils'
import { defaultFieldResolver, GraphQLError } from 'graphql'
import { HTTPError } from 'h3'
import { defineDirective } from 'nitro-graphql/define'

/**
 * @auth directive
 * Requires user to be authenticated via Better Auth
 * Usage: field @auth
 */
export const authDirective = defineDirective({
  name: 'auth',
  locations: ['FIELD_DEFINITION'],
  description: 'Requires authentication via Better Auth',
  transformer: (schema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const authDirectiveConfig = getDirective(schema, fieldConfig, 'auth')?.[0]

        if (authDirectiveConfig) {
          const { resolve = defaultFieldResolver } = fieldConfig

          fieldConfig.resolve = async function (
            source,
            args,
            context: { context: H3EventContext },
            info,
          ) {
            const { user } = context.context

            if (!user?.id) {
              throw new HTTPError('Unauthorized - Please sign in', {
                status: 401,
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

/**
 * @hasRole directive
 * Requires user to have a specific role
 * Usage: field @hasRole(role: "admin")
 *
 * Note: Better Auth doesn't have built-in roles by default.
 * To use this directive, you need to:
 * 1. Add a 'role' field to the user table
 * 2. Update context.d.ts to include role in User type
 * 3. Populate the role in GraphQL context
 */
export const hasRoleDirective = defineDirective({
  name: 'hasRole',
  locations: ['FIELD_DEFINITION'],
  args: {
    role: {
      type: 'String!',
      description: 'Required role to access this field',
    },
  },
  description: 'Requires user to have a specific role',
  transformer: (schema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const hasRoleDirectiveConfig = getDirective(schema, fieldConfig, 'hasRole')?.[0]

        if (hasRoleDirectiveConfig) {
          const { role: requiredRole } = hasRoleDirectiveConfig
          const { resolve = defaultFieldResolver } = fieldConfig

          fieldConfig.resolve = async function (source, args, context, info) {
            const { user } = context.context

            // Check authentication first
            if (!user?.id) {
              throw new HTTPError('Unauthorized - Please sign in', {
                status: 401,
              })
            }

            // Check role (requires custom role implementation)
            const userRole = (user as any).role as string | undefined

            if (!userRole || userRole !== requiredRole) {
              throw new GraphQLError(`Forbidden - Requires ${requiredRole} role`, {
                extensions: {
                  code: 'FORBIDDEN',
                  requiredRole,
                  userRole: userRole || null,
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

import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils'
import { defaultFieldResolver, GraphQLError } from 'graphql'
import { defineDirective } from 'nitro-graphql/utils/define'

/**
 * @permission directive - Check multiple permissions
 *
 * Examples:
 * - @permission(roles: ["ADMIN", "MODERATOR"]) - Require one of the roles
 * - @permission(roles: ["ADMIN"], scopes: ["read:users", "write:users"]) - Require role AND scopes
 * - @permission(requireAll: true, roles: ["ADMIN", "VERIFIED"]) - Require ALL roles
 */
export const permissionDirective = defineDirective({
  name: 'permission',
  locations: ['FIELD_DEFINITION', 'OBJECT'],
  args: {
    roles: {
      type: '[String!]',
      description: 'Array of required roles',
    },
    scopes: {
      type: '[String!]',
      description: 'Array of required permission scopes',
    },
    requireAll: {
      type: 'Boolean',
      defaultValue: false,
      description: 'Whether to require all roles/scopes (AND) or any (OR)',
    },
  },
  description: 'Check for multiple permissions',
  transformer: (schema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const permissionConfig = getDirective(schema, fieldConfig, 'permission')?.[0]

        if (permissionConfig) {
          const { resolve = defaultFieldResolver } = fieldConfig

          fieldConfig.resolve = async function (source, args, context, info) {
            const { roles, scopes, requireAll } = permissionConfig

            // Check roles
            if (roles && roles.length > 0) {
              const userRoles = context.user?.roles || []

              if (requireAll) {
                const hasAllRoles = roles.every(role => userRoles.includes(role))
                if (!hasAllRoles) {
                  throw new GraphQLError(`Required roles: ${roles.join(', ')}`, {
                    extensions: { code: 'FORBIDDEN' },
                  })
                }
              }
              else {
                const hasAnyRole = roles.some(role => userRoles.includes(role))
                if (!hasAnyRole) {
                  throw new GraphQLError(`Requires one of: ${roles.join(', ')}`, {
                    extensions: { code: 'FORBIDDEN' },
                  })
                }
              }
            }

            // Check scopes
            if (scopes && scopes.length > 0) {
              const userScopes = context.user?.scopes || []

              if (requireAll) {
                const hasAllScopes = scopes.every(scope => userScopes.includes(scope))
                if (!hasAllScopes) {
                  throw new GraphQLError(`Required scopes: ${scopes.join(', ')}`, {
                    extensions: { code: 'FORBIDDEN' },
                  })
                }
              }
              else {
                const hasAnyScope = scopes.some(scope => userScopes.includes(scope))
                if (!hasAnyScope) {
                  throw new GraphQLError(`Requires one of: ${scopes.join(', ')}`, {
                    extensions: { code: 'FORBIDDEN' },
                  })
                }
              }
            }

            return resolve(source, args, context, info)
          }
        }

        return fieldConfig
      },
    })
  },
})

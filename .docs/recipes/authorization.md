# Authorization

Complete guide to implementing authorization in Nitro GraphQL with role-based access control (RBAC), custom directives, and field-level permissions.

## Overview

This recipe covers:
- Role-based access control (RBAC)
- Custom authorization directives
- Field-level permissions
- Resource-based authorization
- Permission middleware
- Testing authorization logic

## Role-Based Access Control (RBAC)

### 1. Define Roles Schema

Create `server/graphql/auth/roles.graphql`:

```graphql
enum Role {
  USER
  MODERATOR
  ADMIN
  SUPER_ADMIN
}

type User {
  id: ID!
  email: String!
  name: String!
  role: Role!
  createdAt: DateTime!
}

extend type Query {
  # Public
  users: [User!]!

  # Admin only
  allUsers: [User!]! @hasRole(role: "ADMIN")
  userStats: UserStats! @hasRole(role: "ADMIN")
}

extend type Mutation {
  # User's own profile
  updateProfile(input: UpdateProfileInput!): User!

  # Admin operations
  updateUserRole(userId: ID!, role: Role!): User! @hasRole(role: "ADMIN")
  deleteUser(userId: ID!): Boolean! @hasRole(role: "ADMIN")
  banUser(userId: ID!): Boolean! @hasRole(role: "MODERATOR")
}

type UserStats {
  totalUsers: Int!
  activeUsers: Int!
  bannedUsers: Int!
}
```

### 2. Create Authorization Directives

Create `server/graphql/directives/auth.directive.ts`:

```typescript
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils'
import { defaultFieldResolver, GraphQLError } from 'graphql'

// @auth directive - Requires authentication
export const authDirective = defineDirective({
  name: 'auth',
  locations: ['FIELD_DEFINITION', 'OBJECT'],
  description: 'Requires user to be authenticated',
  transformer: (schema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const authDirectiveConfig = getDirective(schema, fieldConfig, 'auth')?.[0]

        if (authDirectiveConfig) {
          const { resolve = defaultFieldResolver } = fieldConfig

          fieldConfig.resolve = async function (source, args, context, info) {
            if (!context.user) {
              throw new GraphQLError('Authentication required', {
                extensions: {
                  code: 'UNAUTHENTICATED',
                  http: { status: 401 },
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

// @hasRole directive - Requires specific role
export const hasRoleDirective = defineDirective({
  name: 'hasRole',
  locations: ['FIELD_DEFINITION', 'OBJECT'],
  args: {
    role: {
      type: 'Role!',
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
            if (!context.user) {
              throw new GraphQLError('Authentication required', {
                extensions: {
                  code: 'UNAUTHENTICATED',
                  http: { status: 401 },
                },
              })
            }

            if (!hasRole(context.user.role, requiredRole)) {
              throw new GraphQLError(`${requiredRole} role required`, {
                extensions: {
                  code: 'FORBIDDEN',
                  http: { status: 403 },
                  requiredRole,
                  userRole: context.user.role,
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

// @hasAnyRole directive - Requires any of the specified roles
export const hasAnyRoleDirective = defineDirective({
  name: 'hasAnyRole',
  locations: ['FIELD_DEFINITION'],
  args: {
    roles: {
      type: '[Role!]!',
      description: 'List of acceptable roles',
    },
  },
  description: 'Requires user to have any of the specified roles',
  transformer: (schema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const hasAnyRoleDirectiveConfig = getDirective(schema, fieldConfig, 'hasAnyRole')?.[0]

        if (hasAnyRoleDirectiveConfig) {
          const { roles: acceptableRoles } = hasAnyRoleDirectiveConfig
          const { resolve = defaultFieldResolver } = fieldConfig

          fieldConfig.resolve = async function (source, args, context, info) {
            if (!context.user) {
              throw new GraphQLError('Authentication required', {
                extensions: { code: 'UNAUTHENTICATED' },
              })
            }

            const hasAccess = acceptableRoles.some((role: string) =>
              hasRole(context.user.role, role)
            )

            if (!hasAccess) {
              throw new GraphQLError('Insufficient permissions', {
                extensions: {
                  code: 'FORBIDDEN',
                  acceptableRoles,
                  userRole: context.user.role,
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

// Helper function to check role hierarchy
function hasRole(userRole: string, requiredRole: string): boolean {
  const roleHierarchy: Record<string, number> = {
    USER: 1,
    MODERATOR: 2,
    ADMIN: 3,
    SUPER_ADMIN: 4,
  }

  return (roleHierarchy[userRole] || 0) >= (roleHierarchy[requiredRole] || 0)
}
```

### 3. Resource Ownership Directive

Create `server/graphql/directives/owner.directive.ts`:

```typescript
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils'
import { defaultFieldResolver, GraphQLError } from 'graphql'

// @isOwner directive - Requires user to be the resource owner
export const isOwnerDirective = defineDirective({
  name: 'isOwner',
  locations: ['FIELD_DEFINITION'],
  args: {
    ownerField: {
      type: 'String',
      description: 'Field name containing the owner ID',
      defaultValue: 'userId',
    },
  },
  description: 'Requires user to be the owner of the resource or an admin',
  transformer: (schema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const isOwnerDirectiveConfig = getDirective(schema, fieldConfig, 'isOwner')?.[0]

        if (isOwnerDirectiveConfig) {
          const { ownerField = 'userId' } = isOwnerDirectiveConfig
          const { resolve = defaultFieldResolver } = fieldConfig

          fieldConfig.resolve = async function (source, args, context, info) {
            if (!context.user) {
              throw new GraphQLError('Authentication required', {
                extensions: { code: 'UNAUTHENTICATED' },
              })
            }

            // Admins can access any resource
            if (context.user.role === 'ADMIN' || context.user.role === 'SUPER_ADMIN') {
              return resolve(source, args, context, info)
            }

            // Get resource ID from args or parent
            const resourceId = args.id || args.userId || source?.id

            if (!resourceId) {
              throw new GraphQLError('Resource ID not found', {
                extensions: { code: 'BAD_REQUEST' },
              })
            }

            // For mutations, check if user is modifying their own resource
            if (args.id && args.id !== context.user.id) {
              throw new GraphQLError('You can only modify your own resources', {
                extensions: {
                  code: 'FORBIDDEN',
                  resourceId: args.id,
                  userId: context.user.id,
                },
              })
            }

            // For queries, verify ownership from parent object or database
            if (source && source[ownerField] && source[ownerField] !== context.user.id) {
              throw new GraphQLError('Access denied to this resource', {
                extensions: {
                  code: 'FORBIDDEN',
                  ownerId: source[ownerField],
                  userId: context.user.id,
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
```

### 4. Register Directives

Update `server/graphql/_directives.graphql`:

```graphql
directive @auth on FIELD_DEFINITION | OBJECT
directive @hasRole(role: Role!) on FIELD_DEFINITION | OBJECT
directive @hasAnyRole(roles: [Role!]!) on FIELD_DEFINITION
directive @isOwner(ownerField: String = "userId") on FIELD_DEFINITION
```

## Authorization Utilities

Create `server/utils/authorization.ts`:

```typescript
import type { User } from '@prisma/client'
import { GraphQLError } from 'graphql'

export const Roles = {
  USER: 'USER',
  MODERATOR: 'MODERATOR',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const

export type RoleType = typeof Roles[keyof typeof Roles]

// Role hierarchy for comparison
const roleHierarchy: Record<RoleType, number> = {
  [Roles.USER]: 1,
  [Roles.MODERATOR]: 2,
  [Roles.ADMIN]: 3,
  [Roles.SUPER_ADMIN]: 4,
}

// Check if user has required role or higher
export function hasRole(userRole: RoleType, requiredRole: RoleType): boolean {
  return (roleHierarchy[userRole] || 0) >= (roleHierarchy[requiredRole] || 0)
}

// Check if user has any of the specified roles
export function hasAnyRole(userRole: RoleType, roles: RoleType[]): boolean {
  return roles.some(role => hasRole(userRole, role))
}

// Require authentication
export function requireAuth(user: User | null): asserts user is User {
  if (!user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }
}

// Require specific role
export function requireRole(user: User | null, requiredRole: RoleType): asserts user is User {
  requireAuth(user)

  if (!hasRole(user.role as RoleType, requiredRole)) {
    throw new GraphQLError(`${requiredRole} role required`, {
      extensions: {
        code: 'FORBIDDEN',
        requiredRole,
        userRole: user.role,
      },
    })
  }
}

// Require any of the specified roles
export function requireAnyRole(user: User | null, roles: RoleType[]): asserts user is User {
  requireAuth(user)

  if (!hasAnyRole(user.role as RoleType, roles)) {
    throw new GraphQLError('Insufficient permissions', {
      extensions: {
        code: 'FORBIDDEN',
        acceptableRoles: roles,
        userRole: user.role,
      },
    })
  }
}

// Check if user is the resource owner
export function isOwner(user: User | null, resourceOwnerId: string): boolean {
  return user?.id === resourceOwnerId
}

// Require ownership or admin role
export function requireOwnershipOrAdmin(
  user: User | null,
  resourceOwnerId: string
): asserts user is User {
  requireAuth(user)

  const isAdmin = hasRole(user.role as RoleType, Roles.ADMIN)
  const isResourceOwner = isOwner(user, resourceOwnerId)

  if (!isAdmin && !isResourceOwner) {
    throw new GraphQLError('Access denied to this resource', {
      extensions: {
        code: 'FORBIDDEN',
        ownerId: resourceOwnerId,
        userId: user.id,
      },
    })
  }
}

// Permission checker
export interface Permission {
  resource: string
  action: 'create' | 'read' | 'update' | 'delete'
}

export const permissions: Record<RoleType, Permission[]> = {
  [Roles.USER]: [
    { resource: 'profile', action: 'read' },
    { resource: 'profile', action: 'update' },
    { resource: 'post', action: 'create' },
    { resource: 'post', action: 'read' },
  ],
  [Roles.MODERATOR]: [
    { resource: 'user', action: 'read' },
    { resource: 'post', action: 'delete' },
    { resource: 'comment', action: 'delete' },
  ],
  [Roles.ADMIN]: [
    { resource: 'user', action: 'create' },
    { resource: 'user', action: 'read' },
    { resource: 'user', action: 'update' },
    { resource: 'user', action: 'delete' },
  ],
  [Roles.SUPER_ADMIN]: [
    { resource: '*', action: 'create' },
    { resource: '*', action: 'read' },
    { resource: '*', action: 'update' },
    { resource: '*', action: 'delete' },
  ],
}

export function hasPermission(
  userRole: RoleType,
  resource: string,
  action: Permission['action']
): boolean {
  // Get permissions for this role and all lower roles
  const roleLevel = roleHierarchy[userRole] || 0
  const applicableRoles = Object.entries(roleHierarchy)
    .filter(([_, level]) => level <= roleLevel)
    .map(([role]) => role as RoleType)

  // Check if user has the required permission
  for (const role of applicableRoles) {
    const rolePermissions = permissions[role] || []

    const hasExactPermission = rolePermissions.some(
      p => (p.resource === resource || p.resource === '*') && p.action === action
    )

    if (hasExactPermission) {
      return true
    }
  }

  return false
}

export function requirePermission(
  user: User | null,
  resource: string,
  action: Permission['action']
): asserts user is User {
  requireAuth(user)

  if (!hasPermission(user.role as RoleType, resource, action)) {
    throw new GraphQLError(`Permission denied: cannot ${action} ${resource}`, {
      extensions: {
        code: 'FORBIDDEN',
        resource,
        action,
        userRole: user.role,
      },
    })
  }
}
```

## Protected Resolvers

### 1. Using Authorization Utilities

Create `server/graphql/users/admin.resolver.ts`:

```typescript
import {
  requireAuth,
  requireOwnershipOrAdmin,
  requireRole,
  Roles,
} from '../../utils/authorization'

export const adminUserResolvers = defineResolver({
  Query: {
    // Admin-only: Get all users including deleted
    allUsers: async (_parent, _args, context) => {
      requireRole(context.user, Roles.ADMIN)

      return await context.db.user.findMany({
        include: {
          _count: {
            select: { posts: true },
          },
        },
      })
    },

    // Admin-only: Get user statistics
    userStats: async (_parent, _args, context) => {
      requireRole(context.user, Roles.ADMIN)

      const [totalUsers, activeUsers, bannedUsers] = await Promise.all([
        context.db.user.count(),
        context.db.user.count({ where: { bannedAt: null } }),
        context.db.user.count({ where: { bannedAt: { not: null } } }),
      ])

      return {
        totalUsers,
        activeUsers,
        bannedUsers,
      }
    },
  },

  Mutation: {
    // User can update their own profile, admin can update any
    updateProfile: async (_parent, { input }, context) => {
      requireAuth(context.user)
      requireOwnershipOrAdmin(context.user, input.userId)

      return await context.db.user.update({
        where: { id: input.userId },
        data: input,
      })
    },

    // Admin only: Update user role
    updateUserRole: async (_parent, { userId, role }, context) => {
      requireRole(context.user, Roles.ADMIN)

      // Super admin required to assign admin roles
      if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
        requireRole(context.user, Roles.SUPER_ADMIN)
      }

      return await context.db.user.update({
        where: { id: userId },
        data: { role },
      })
    },

    // Admin only: Delete user
    deleteUser: async (_parent, { userId }, context) => {
      requireRole(context.user, Roles.ADMIN)

      // Prevent deleting super admin
      const targetUser = await context.db.user.findUnique({
        where: { id: userId },
      })

      if (targetUser?.role === 'SUPER_ADMIN') {
        throw new GraphQLError('Cannot delete super admin', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      await context.db.user.delete({
        where: { id: userId },
      })

      return true
    },

    // Moderator or admin: Ban user
    banUser: async (_parent, { userId }, context) => {
      requireAnyRole(context.user, [Roles.MODERATOR, Roles.ADMIN])

      return await context.db.user.update({
        where: { id: userId },
        data: { bannedAt: new Date() },
      })
    },
  },
})
```

### 2. Field-Level Authorization

Create `server/graphql/users/user.resolver.ts`:

```typescript
export const userFieldResolvers = defineResolver({
  User: {
    // Email is only visible to the user themselves or admins
    email: async (parent, _args, context) => {
      if (!context.user) {
        return null // Or throw error
      }

      const isOwner = parent.id === context.user.id
      const isAdmin = hasRole(context.user.role, Roles.ADMIN)

      if (!isOwner && !isAdmin) {
        return null // Hide email from other users
      }

      return parent.email
    },

    // Phone number only visible to admins
    phoneNumber: async (parent, _args, context) => {
      if (!context.user || !hasRole(context.user.role, Roles.ADMIN)) {
        return null
      }

      return parent.phoneNumber
    },

    // Stats visible to everyone but detailed stats only to owner/admin
    stats: async (parent, _args, context) => {
      const isOwner = context.user?.id === parent.id
      const isAdmin = context.user && hasRole(context.user.role, Roles.ADMIN)

      const stats = await context.db.userStats.findUnique({
        where: { userId: parent.id },
      })

      if (!isOwner && !isAdmin) {
        // Return limited stats
        return {
          postsCount: stats?.postsCount || 0,
          // Hide sensitive stats
        }
      }

      // Return full stats
      return stats
    },
  },
})
```

## Permission-Based Authorization

Create `server/graphql/posts/post.resolver.ts`:

```typescript
import { requirePermission } from '../../utils/authorization'

export const postResolvers = defineResolver({
  Query: {
    posts: async (_parent, _args, context) => {
      requirePermission(context.user, 'post', 'read')

      return await context.db.post.findMany({
        where: { published: true },
      })
    },
  },

  Mutation: {
    createPost: async (_parent, { input }, context) => {
      requirePermission(context.user, 'post', 'create')

      return await context.db.post.create({
        data: {
          ...input,
          authorId: context.user.id,
        },
      })
    },

    updatePost: async (_parent, { id, input }, context) => {
      requirePermission(context.user, 'post', 'update')

      const post = await context.db.post.findUnique({
        where: { id },
      })

      if (!post) {
        throw new GraphQLError('Post not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Users can only update their own posts unless they're admin
      requireOwnershipOrAdmin(context.user, post.authorId)

      return await context.db.post.update({
        where: { id },
        data: input,
      })
    },

    deletePost: async (_parent, { id }, context) => {
      requirePermission(context.user, 'post', 'delete')

      const post = await context.db.post.findUnique({
        where: { id },
      })

      if (!post) {
        throw new GraphQLError('Post not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Only owner or moderator+ can delete
      const canDelete
        = context.user.id === post.authorId
          || hasRole(context.user.role, Roles.MODERATOR)

      if (!canDelete) {
        throw new GraphQLError('Cannot delete this post', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      await context.db.post.delete({ where: { id } })
      return true
    },
  },
})
```

## Testing Authorization

Create `server/graphql/__tests__/authorization.test.ts`:

```typescript
import { execute, parse } from 'graphql'
import { beforeEach, describe, expect, it } from 'vitest'
import { Roles } from '../../utils/authorization'
import { db } from '../../utils/database'
import { schema } from '../schema'

describe('Authorization', () => {
  let adminUser: any
  let regularUser: any

  beforeEach(async () => {
    await db.user.deleteMany()

    adminUser = await db.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Admin User',
        role: Roles.ADMIN,
      },
    })

    regularUser = await db.user.create({
      data: {
        email: 'user@example.com',
        name: 'Regular User',
        role: Roles.USER,
      },
    })
  })

  it('should allow admin to access admin-only query', async () => {
    const query = parse(`
      query {
        userStats {
          totalUsers
          activeUsers
        }
      }
    `)

    const result = await execute({
      schema,
      document: query,
      contextValue: { db, user: adminUser },
    })

    expect(result.errors).toBeUndefined()
    expect(result.data?.userStats).toBeDefined()
  })

  it('should deny regular user access to admin-only query', async () => {
    const query = parse(`
      query {
        userStats {
          totalUsers
        }
      }
    `)

    const result = await execute({
      schema,
      document: query,
      contextValue: { db, user: regularUser },
    })

    expect(result.errors).toBeDefined()
    expect(result.errors?.[0].extensions?.code).toBe('FORBIDDEN')
  })

  it('should allow user to update their own profile', async () => {
    const mutation = parse(`
      mutation {
        updateProfile(input: {
          userId: "${regularUser.id}"
          name: "Updated Name"
        }) {
          name
        }
      }
    `)

    const result = await execute({
      schema,
      document: mutation,
      contextValue: { db, user: regularUser },
    })

    expect(result.errors).toBeUndefined()
    expect(result.data?.updateProfile.name).toBe('Updated Name')
  })

  it('should deny user from updating another user\'s profile', async () => {
    const mutation = parse(`
      mutation {
        updateProfile(input: {
          userId: "${adminUser.id}"
          name: "Hacked Name"
        }) {
          name
        }
      }
    `)

    const result = await execute({
      schema,
      document: mutation,
      contextValue: { db, user: regularUser },
    })

    expect(result.errors).toBeDefined()
    expect(result.errors?.[0].extensions?.code).toBe('FORBIDDEN')
  })

  it('should allow admin to update any profile', async () => {
    const mutation = parse(`
      mutation {
        updateProfile(input: {
          userId: "${regularUser.id}"
          name: "Admin Updated"
        }) {
          name
        }
      }
    `)

    const result = await execute({
      schema,
      document: mutation,
      contextValue: { db, user: adminUser },
    })

    expect(result.errors).toBeUndefined()
    expect(result.data?.updateProfile.name).toBe('Admin Updated')
  })
})
```

## Best Practices

### 1. Fail Securely

Default to denying access:
```typescript
if (!hasPermission(user, resource, action)) {
  throw new GraphQLError('Access denied')
}
```

### 2. Centralize Authorization Logic

Keep authorization logic in utilities, not scattered in resolvers.

### 3. Use Type-Safe Roles

Define roles as constants or enums:
```typescript
export const Roles = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const
```

### 4. Audit Authorization Changes

Log authorization failures:
```typescript
console.error('Authorization failure', {
  userId: user?.id,
  resource,
  action,
  timestamp: new Date(),
})
```

### 5. Test Edge Cases

Test:
- Unauthenticated users
- Users with insufficient permissions
- Users trying to access other users' resources
- Admin override scenarios

## Related Recipes

- [Authentication](./authentication.md) - Setting up authentication
- [Custom Directives](../guide/custom-directives.md) - Creating custom directives
- [Error Handling](../guide/error-handling.md) - Proper error responses

## Playground Example

See authorization implementation in:
- Directives: `playgrounds/nuxt/server/graphql/auth.directive.ts`
- Schema: `playgrounds/nuxt/server/graphql/_directives.graphql`

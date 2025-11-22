import { defineQuery } from 'nitro-graphql/define'
import { mockUsers } from './userStore'

/**
 * User query resolver with union type error handling
 * Returns explicit error types instead of null for better type safety
 */
export const data = defineQuery({
  getUser: (_parent, args, _ctx) => {
    // Demo: Simulate unauthorized access
    if (args.id === 'forbidden') {
      return {
        __typename: 'UnauthorizedError',
        message: 'You do not have permission to access this user',
        requiredPermission: 'user:read',
      }
    }

    // Try to find the user
    const user = mockUsers.find(u => u.id === args.id)

    // User not found - return explicit error type
    if (!user) {
      return {
        __typename: 'UserNotFoundError',
        message: `User with ID "${args.id}" does not exist`,
        userId: args.id,
      }
    }

    // Success case - return user with typename
    return {
      __typename: 'User',
      ...user,
    }
  },
})
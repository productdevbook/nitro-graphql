/**
 * Type guard utilities for GraphQL union type handling
 * These helpers provide type-safe discrimination of union types
 */

/**
 * Type guard to check if a result is a specific typename
 * Provides TypeScript type narrowing for union types
 *
 * @example
 * ```ts
 * const result = await getUserResult('123')
 * if (isType(result, 'User')) {
 *   // TypeScript knows result is User type here
 *   console.log(result.email)
 * }
 * ```
 */
export function isType<T extends { __typename?: string }>(
  result: T,
  typename: string,
): result is T & { __typename: typeof typename } {
  return result.__typename === typename
}

/**
 * Type guard to check if a result is a success type (not an error)
 * Useful when you have multiple success types in a union
 *
 * @example
 * ```ts
 * if (isSuccess(result, 'User')) {
 *   // Handle success case
 * }
 * ```
 */
export function isSuccess<T extends { __typename?: string }>(
  result: T,
  successTypename: string,
): result is T & { __typename: typeof successTypename } {
  return result.__typename === successTypename
}

/**
 * Type guard to check if a result implements the Error interface
 * Works for any error type that has a message field
 *
 * @example
 * ```ts
 * if (isError(result)) {
 *   // result has message field
 *   console.error(result.message)
 * }
 * ```
 */
export function isError<T extends { __typename?: string, message?: string }>(
  result: T,
): result is T & { message: string } {
  return 'message' in result && typeof result.message === 'string'
}

/**
 * Type guard for UserNotFoundError specifically
 */
export function isUserNotFoundError<T extends { __typename?: string }>(
  result: T,
): result is T & { __typename: 'UserNotFoundError', message: string, userId: string } {
  return result.__typename === 'UserNotFoundError'
}

/**
 * Type guard for UnauthorizedError specifically
 */
export function isUnauthorizedError<T extends { __typename?: string }>(
  result: T,
): result is T & { __typename: 'UnauthorizedError', message: string, requiredPermission: string } {
  return result.__typename === 'UnauthorizedError'
}

/**
 * Helper to extract error message from any error type
 * Returns null if the result is not an error
 *
 * @example
 * ```ts
 * const errorMsg = getErrorMessage(result)
 * if (errorMsg) {
 *   showNotification(errorMsg)
 * }
 * ```
 */
export function getErrorMessage<T extends { __typename?: string, message?: string }>(
  result: T,
): string | null {
  return isError(result) ? result.message : null
}

/**
 * Type-safe exhaustiveness check for switch statements
 * Ensures all union members are handled
 *
 * @example
 * ```ts
 * switch (result.__typename) {
 *   case 'User': return handleUser(result)
 *   case 'UserNotFoundError': return handleNotFound(result)
 *   case 'UnauthorizedError': return handleUnauthorized(result)
 *   default: return assertNever(result) // Compile error if new type added
 * }
 * ```
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled discriminated union member: ${JSON.stringify(value)}`)
}

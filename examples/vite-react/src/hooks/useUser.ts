import { useMutation, useQuery } from '@tanstack/react-query'
import { $sdk } from '../graphql/default/ofetch'
import { isError, isType, isUnauthorizedError, isUserNotFoundError } from '../utils/graphql-helpers'

/**
 * Reusable hook for user data with union type error handling
 *
 * This hook demonstrates the "Errors as Data" pattern where errors
 * are part of the schema rather than out-of-band in the errors array.
 *
 * @param userId - User ID to fetch
 *
 * @example
 * ```ts
 * const userId = '123'
 * const { user, isLoading, isSuccess, isNotFound, errorMessage } = useUser(userId)
 *
 * if (isSuccess) {
 *   console.log(user?.name)
 * } else if (isNotFound) {
 *   console.log('User not found')
 * }
 * ```
 */
export function useUser(userId: string = '1') {
  const query = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const result = await $sdk.test({ id: userId })

      // System errors (network, server crash, etc.) still go in errors array
      if (result.errors) {
        throw new Error(result.errors[0].message)
      }

      // Return the union type result (User | UserNotFoundError | UnauthorizedError)
      return result.data?.getUser
    },
    staleTime: 5000,
  })

  const { data: userResult } = query

  // Type-safe discrimination properties
  const isSuccess = userResult ? isType(userResult, 'User') : false
  const isNotFound = userResult ? isUserNotFoundError(userResult) : false
  const isUnauthorized = userResult ? isUnauthorizedError(userResult) : false
  const isErrorResult = userResult ? isError(userResult) : false

  // Extract user data (only available when success)
  const user = isSuccess && userResult?.__typename === 'User' ? userResult : null

  // Extract error message (available for any error type)
  const errorMessage = isErrorResult && userResult && 'message' in userResult ? userResult.message : null

  return {
    ...query,
    userResult,
    user,
    isSuccess,
    isNotFound,
    isUnauthorized,
    isErrorResult,
    errorMessage,
  }
}

/**
 * Example mutation hook
 */
export function useUpdateUser() {
  return useMutation({
    mutationFn: async (variables: { id: string, name: string }) => {
      // GraphQL mutation will be done here
      // eslint-disable-next-line no-console
      console.log('Update user:', variables)
      return variables
    },
    onSuccess: () => {
      // eslint-disable-next-line no-console
      console.log('User updated successfully')
    },
  })
}

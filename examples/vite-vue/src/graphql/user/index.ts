import type { MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery } from '@pinia/colada'
import { computed, toValue } from 'vue'
import { isError, isType, isUnauthorizedError, isUserNotFoundError } from '../../utils/graphql-helpers'
import { $sdk } from '../default/ofetch'

/**
 * Reusable composable for user data with union type error handling
 *
 * This composable demonstrates the "Errors as Data" pattern where errors
 * are part of the schema rather than out-of-band in the errors array.
 *
 * @param userId - User ID to fetch (can be a ref, getter, or plain string)
 *
 * @example
 * ```ts
 * const userId = ref('123')
 * const { user, isLoading, isSuccess, isNotFound, errorMessage } = useUser(userId)
 *
 * if (isSuccess.value) {
 *   console.log(user.value?.name)
 * } else if (isNotFound.value) {
 *   console.log('User not found')
 * }
 * ```
 */
export function useUser(userId: MaybeRefOrGetter<string> = '1') {
  // Query returns UserResult union type
  const { data: userResult, isLoading, error, refetch } = useQuery({
    key: () => ['user', toValue(userId)],
    query: async () => {
      const result = await $sdk.test({ id: toValue(userId) })

      // System errors (network, server crash, etc.) still go in errors array
      if (result.errors) {
        throw new Error(result.errors[0]?.message)
      }

      // Return the union type result (User | UserNotFoundError | UnauthorizedError)
      return result.data?.getUser
    },
    staleTime: 5000,
  })

  // Computed properties for type-safe discrimination
  const isSuccess = computed(() =>
    userResult.value ? isType(userResult.value, 'User') : false,
  )

  const isNotFound = computed(() =>
    userResult.value ? isUserNotFoundError(userResult.value) : false,
  )

  const isUnauthorized = computed(() =>
    userResult.value ? isUnauthorizedError(userResult.value) : false,
  )

  const isErrorResult = computed(() =>
    userResult.value ? isError(userResult.value) : false,
  )

  // Extract user data (only available when success)
  const user = computed(() =>
    isSuccess.value && userResult.value?.__typename === 'User'
      ? userResult.value
      : null,
  )

  // Extract error message (available for any error type)
  const errorMessage = computed(() =>
    isErrorResult.value && userResult.value && 'message' in userResult.value
      ? userResult.value.message
      : null,
  )

  return {
    // Raw result (includes __typename and all union members)
    userResult,

    // Extracted user data (null if error)
    user,

    // Loading state
    isLoading,

    // System error (network, server crash)
    error,

    // Type discrimination flags
    isSuccess,
    isNotFound,
    isUnauthorized,
    isErrorResult,

    // Extracted error message
    errorMessage,

    // Refetch function
    refetch,
  }
}

/**
 * Example mutation composable
 */
export function useUpdateUser() {
  return useMutation({
    mutation: async (variables: { id: string, name: string }) => {
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

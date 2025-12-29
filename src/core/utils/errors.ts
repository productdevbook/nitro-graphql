/**
 * Error handling utilities for GraphQL
 * Framework-agnostic error masking and handling
 */

import { GraphQLError } from 'graphql'

export interface MaskErrorOptions {
  /**
   * Default HTTP status code for validation errors (ZodError)
   * @default 400
   */
  validationStatusCode?: number

  /**
   * Default HTTP status code for HTTP errors when status is not provided
   * @default 500
   */
  defaultHttpStatusCode?: number
}

/**
 * Default error masking function for GraphQL Yoga
 * Handles common error types like ZodError and HTTPError
 *
 * @param options - Configuration options for error handling
 *
 * @example Basic usage
 * ```ts
 * import { defineGraphQLConfig } from 'nitro-graphql/define'
 * import { createDefaultMaskError } from 'nitro-graphql/core/utils'
 *
 * export default defineGraphQLConfig({
 *   maskedErrors: {
 *     maskError: createDefaultMaskError()
 *   }
 * })
 * ```
 *
 * @example Custom status codes
 * ```ts
 * import { defineGraphQLConfig } from 'nitro-graphql/define'
 * import { createDefaultMaskError } from 'nitro-graphql/core/utils'
 *
 * export default defineGraphQLConfig({
 *   maskedErrors: {
 *     maskError: createDefaultMaskError({
 *       validationStatusCode: 422,  // Use 422 for validation errors
 *       defaultHttpStatusCode: 500  // Use 500 for unknown HTTP errors
 *     })
 *   }
 * })
 * ```
 *
 * @example Custom error handling with fallback to default
 * ```ts
 * import { defineGraphQLConfig } from 'nitro-graphql/define'
 * import { createDefaultMaskError } from 'nitro-graphql/core/utils'
 *
 * const defaultMaskError = createDefaultMaskError()
 *
 * export default defineGraphQLConfig({
 *   maskedErrors: {
 *     maskError: (error: unknown) => {
 *       // Handle custom errors first
 *       if (error instanceof MyCustomError) {
 *         return new GraphQLError(error.message, {
 *           extensions: { code: 'CUSTOM_ERROR' }
 *         })
 *       }
 *
 *       // Fall back to default handling
 *       return defaultMaskError(error)
 *     }
 *   }
 * })
 * ```
 */
export function createDefaultMaskError(options?: MaskErrorOptions) {
  const validationStatusCode = options?.validationStatusCode ?? 400
  const defaultHttpStatusCode = options?.defaultHttpStatusCode ?? 500
  return (error: unknown): Error => {
    // Type guard to check if error has originalError property
    if (error && typeof error === 'object' && 'originalError' in error) {
      const graphqlError = error as { originalError: unknown }

      // Check if the original error is a ZodError
      // We check for the structure instead of instanceof to avoid importing zod
      if (
        graphqlError.originalError
        && typeof graphqlError.originalError === 'object'
        && 'issues' in graphqlError.originalError
        && Array.isArray(graphqlError.originalError.issues)
      ) {
        const zodError = graphqlError.originalError as {
          issues: Array<{ path: Array<string | number>, message: string }>
        }

        // Format validation errors in a user-friendly way
        const validationErrors = zodError.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
        }))

        return new GraphQLError('Validation failed', {
          extensions: {
            code: 'BAD_USER_INPUT',
            validationErrors,
            http: {
              status: validationStatusCode,
            },
          },
        })
      }

      // Check if the original error is an HTTPError from H3
      // We check for the structure instead of instanceof to avoid importing h3
      if (
        graphqlError.originalError
        && typeof graphqlError.originalError === 'object'
        && 'statusCode' in graphqlError.originalError
        && 'statusMessage' in graphqlError.originalError
      ) {
        const httpError = graphqlError.originalError as {
          statusCode?: number
          statusMessage?: string
          message?: string
        }

        const statusCode = httpError.statusCode ?? defaultHttpStatusCode
        const message = httpError.statusMessage || httpError.message || 'Internal Server Error'

        return new GraphQLError(message, {
          extensions: {
            code: statusCode,
            http: {
              status: statusCode,
            },
          },
        })
      }
    }

    // Fall back to default masking for other errors
    return error instanceof Error ? error : new Error(String(error))
  }
}

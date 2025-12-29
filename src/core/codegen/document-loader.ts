/**
 * Document loading utilities
 * Load GraphQL client documents from files
 */

import type { Source } from '@graphql-tools/utils'
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader'
import { loadDocuments } from '@graphql-tools/load'

/**
 * Load GraphQL documents from files
 */
export async function loadGraphQLDocuments(patterns: string | string[]): Promise<Source[]> {
  try {
    return await loadDocuments(patterns, {
      loaders: [new GraphQLFileLoader()],
    })
  }
  catch (e: unknown) {
    const error = e as Error
    if (
      (error.message || '').includes(
        'Unable to find any GraphQL type definitions for the following pointers:',
      )
    ) {
      return []
    }
    throw e
  }
}

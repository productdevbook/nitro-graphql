// This file is auto-generated once by nitro-graphql for quick start
// You can modify this file according to your needs
import type { Requester } from './sdk'
import { ofetch } from 'ofetch'
import { getSdk } from './sdk'

export function createGraphQLClient(endpoint: string): Requester {
  return async <R>(doc: string, vars?: any): Promise<R> => {
    const result = await ofetch(endpoint, {
      method: 'POST',
      body: { query: doc, variables: vars },
      headers: {
        'Content-Type': 'application/json',
      },
    })

    return result as R
  }
}

export const $sdk = getSdk(createGraphQLClient('/api/graphql'))

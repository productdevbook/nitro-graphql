// This file is auto-generated once by nitro-graphql for quick start
// You can modify this file according to your needs
import type { Requester, Sdk } from './sdk'
import { getSdk } from './sdk'

export function createCountriesGraphQLClient(endpoint: string = 'https://countries.trevorblades.com'): Requester {
  return async <R>(doc: string, vars?: any): Promise<R> => {
    const headers = import.meta.server ? useRequestHeaders() : undefined

    const result = await $fetch(endpoint, {
      method: 'POST',
      body: { query: doc, variables: vars },
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    })

    return result as R
  }
}

export const $countriesSdk: Sdk = getSdk(createCountriesGraphQLClient())

/**
 * Shared ofetch template generation utilities
 * Used by both main client and external service code generation
 */

import { capitalize } from './string'

export interface OfetchTemplateOptions {
  /** Service name (e.g., 'default', 'github') */
  serviceName: string
  /** Whether to use Nuxt composables ($fetch, useRequestHeaders) */
  isNuxt: boolean
  /** Endpoint URL for the GraphQL service */
  endpoint: string
  /** Whether this is an external service (affects naming convention) */
  isExternal?: boolean
}

/**
 * Generate ofetch client template content
 *
 * For main (default) service:
 * - SDK exported as `$sdk`
 * - Client function is `createGraphQLClient`
 *
 * For external services:
 * - SDK exported as `$${serviceName}Sdk`
 * - Client function is `create${ServiceName}GraphQLClient`
 * - Endpoint has default value
 */
export function generateOfetchTemplate(options: OfetchTemplateOptions): string {
  const { serviceName, isNuxt, endpoint, isExternal = false } = options

  if (isExternal) {
    return generateExternalOfetchTemplate({ serviceName, isNuxt, endpoint })
  }

  return generateMainOfetchTemplate({ isNuxt, endpoint })
}

/**
 * Generate ofetch template for main (default) GraphQL service
 */
function generateMainOfetchTemplate(options: { isNuxt: boolean, endpoint: string }): string {
  const { isNuxt, endpoint } = options

  if (isNuxt) {
    return `// This file is auto-generated once by nitro-graphql for quick start
// You can modify this file according to your needs
import type { Requester } from './sdk'
import { getSdk } from './sdk'

export function createGraphQLClient(endpoint: string): Requester {
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

export const $sdk = getSdk(createGraphQLClient('${endpoint}'))`
  }

  return `// This file is auto-generated once by nitro-graphql for quick start
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

export const $sdk = getSdk(createGraphQLClient('${endpoint}'))`
}

/**
 * Generate ofetch template for external GraphQL service
 */
function generateExternalOfetchTemplate(options: { serviceName: string, isNuxt: boolean, endpoint: string }): string {
  const { serviceName, isNuxt, endpoint } = options
  const capitalizedName = capitalize(serviceName)

  if (isNuxt) {
    return `// This file is auto-generated once by nitro-graphql for quick start
// You can modify this file according to your needs
import type { Sdk, Requester } from './sdk'
import { getSdk } from './sdk'

export function create${capitalizedName}GraphQLClient(endpoint: string = '${endpoint}'): Requester {
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

export const $${serviceName}Sdk: Sdk = getSdk(create${capitalizedName}GraphQLClient())`
  }

  return `// This file is auto-generated once by nitro-graphql for quick start
// You can modify this file according to your needs
import type { Sdk, Requester } from './sdk'
import { ofetch } from 'ofetch'
import { getSdk } from './sdk'

export function create${capitalizedName}GraphQLClient(endpoint: string = '${endpoint}'): Requester {
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

export const $${serviceName}Sdk: Sdk = getSdk(create${capitalizedName}GraphQLClient())`
}

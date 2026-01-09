/**
 * Proxy route for Apollo Sandbox script with long cache headers
 * This allows us to control caching for the external CDN script
 */
import { defineEventHandler } from 'nitro/h3'

// Apollo Sandbox CDN URL - using _latest for automatic updates
const APOLLO_SANDBOX_CDN = 'https://embeddable-sandbox.cdn.apollographql.com/_latest/embeddable-sandbox.umd.production.min.js'

// Cache the script in memory after first fetch
let cachedScript: string | null = null

export default defineEventHandler(async () => {
  // Return cached script if available
  if (cachedScript) {
    return new Response(cachedScript, {
      headers: {
        'content-type': 'text/javascript; charset=utf-8',
        'cache-control': 'public, max-age=2592000, immutable',
      },
    })
  }

  // Fetch from CDN and cache
  const response = await fetch(APOLLO_SANDBOX_CDN)
  if (!response.ok) {
    throw new Error(`Failed to fetch Apollo Sandbox script: ${response.status}`)
  }

  cachedScript = await response.text()

  return new Response(cachedScript, {
    headers: {
      'content-type': 'text/javascript; charset=utf-8',
      'cache-control': 'public, max-age=2592000, immutable',
    },
  })
})

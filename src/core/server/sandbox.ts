/**
 * Core Sandbox Script Handler
 *
 * Proxies Apollo Sandbox script from CDN with caching.
 * Used by both CLI and Nitro.
 */

// Apollo Sandbox CDN URL - using _latest for automatic updates
export const APOLLO_SANDBOX_CDN = 'https://embeddable-sandbox.cdn.apollographql.com/_latest/embeddable-sandbox.umd.production.min.js'

// Cache the script in memory after first fetch
let cachedScript: string | null = null

/**
 * Fetch and cache the Apollo Sandbox script
 */
export async function fetchSandboxScript(): Promise<string> {
  if (cachedScript) {
    return cachedScript
  }

  const response = await fetch(APOLLO_SANDBOX_CDN)
  if (!response.ok) {
    throw new Error(`Failed to fetch Apollo Sandbox script: ${response.status}`)
  }

  cachedScript = await response.text()
  return cachedScript
}

/**
 * Create a Response with the sandbox script
 */
export async function createSandboxResponse(): Promise<Response> {
  try {
    const script = await fetchSandboxScript()
    return new Response(script, {
      headers: {
        'content-type': 'text/javascript; charset=utf-8',
        'cache-control': 'public, max-age=2592000, immutable',
      },
    })
  }
  catch (error) {
    return new Response(`// Error loading Apollo Sandbox: ${error}`, {
      status: 500,
      headers: {
        'content-type': 'text/javascript; charset=utf-8',
      },
    })
  }
}

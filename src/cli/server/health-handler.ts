/**
 * CLI Health Handler
 *
 * Simple health check endpoint for the CLI dev server.
 */

/**
 * Create a health check handler
 */
export function createHealthHandler(): (request: Request) => Response {
  return (_request: Request) => {
    return Response.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      runtime: detectRuntime(),
    })
  }
}

/**
 * Detect the current JavaScript runtime
 */
function detectRuntime(): string {
  // @ts-expect-error - Bun global
  if (typeof Bun !== 'undefined') {
    return 'bun'
  }
  // @ts-expect-error - Deno global
  if (typeof Deno !== 'undefined') {
    return 'deno'
  }
  if (typeof process !== 'undefined' && process.versions?.node) {
    return `node/${process.versions.node}`
  }
  return 'unknown'
}

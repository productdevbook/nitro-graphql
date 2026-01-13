/**
 * CLI Sandbox Script Handler
 *
 * Uses core sandbox handler.
 */

import { createSandboxResponse } from '../../core/server/sandbox'

/**
 * Create a handler that serves the Apollo Sandbox script
 */
export function createSandboxHandler(): (request: Request) => Promise<Response> {
  return async (_request: Request) => {
    return createSandboxResponse()
  }
}

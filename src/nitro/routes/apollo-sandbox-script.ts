/**
 * Proxy route for Apollo Sandbox script with long cache headers
 * Uses core sandbox handler for consistency with CLI.
 */
import { defineEventHandler } from 'nitro/h3'
import { createSandboxResponse } from '../../core/server/sandbox'

export default defineEventHandler(async () => {
  return createSandboxResponse()
})

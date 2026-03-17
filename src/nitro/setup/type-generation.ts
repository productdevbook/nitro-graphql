/**
 * Shared type generation helper
 * Used by setup, file watcher, and close hooks to avoid duplication
 */

import type { Nitro } from 'nitro/types'
import { generateClientTypes, generateServerTypes } from '../codegen'
import { isServerEnabled } from './scanner'

/**
 * Regenerate all types (server + client)
 * Shared helper that passes schema string directly to avoid disk round-trip
 */
export async function regenerateTypes(
  nitro: Nitro,
  options: { serverEnabled?: boolean, silent?: boolean } = {},
): Promise<void> {
  const { serverEnabled = isServerEnabled(nitro), silent = false } = options
  const opts = silent ? { silent: true } : undefined

  if (serverEnabled) {
    const schemaString = await generateServerTypes(nitro, opts)
    await generateClientTypes(nitro, opts, schemaString)
  }
  else {
    await generateClientTypes(nitro, opts)
  }
}

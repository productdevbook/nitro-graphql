/**
 * External service type generation for Nitro
 * Downloads schemas, generates types and SDKs for external GraphQL services
 */

import type { Nitro } from 'nitro/types'
import type { PathPlaceholders } from '../paths'
import consola from 'consola'
import {
  downloadAndSaveSchema,
  generateExternalClientTypesCore,
  loadExternalSchema,
  loadGraphQLDocuments,
} from '../../core/codegen'
import { writeFile } from '../../core/utils/file-io'
import { getDefaultPaths, getSdkConfig, getTypesConfig, resolveFilePath } from '../paths'

async function generateExternalServiceTypes(
  nitro: Nitro,
  service: NonNullable<NonNullable<Nitro['options']['graphql']>['externalServices']>[number],
  options: { silent?: boolean } = {},
): Promise<void> {
  if (!options.silent)
    consola.info(`[${service.name}] Processing external service`)

  await downloadAndSaveSchema(service, nitro.options.buildDir)
  const schema = await loadExternalSchema(service, nitro.options.buildDir)
  if (!schema) {
    consola.warn(`[${service.name}] Failed to load schema`)
    return
  }
  const docs = service.documents?.length
    ? await loadGraphQLDocuments(service.documents).catch(() => [])
    : []

  if (service.documents?.length && !docs.length) {
    consola.warn(`[${service.name}] No documents found`)
    return
  }

  // Use schema directly without lexicographicSortSchema to avoid graphql instance mismatch
  const types = await generateExternalClientTypesCore(service, schema, docs)
  if (types === false)
    return

  const placeholders = { ...getDefaultPaths(nitro), serviceName: service.name } as PathPlaceholders
  const typesConfig = getTypesConfig(nitro)
  const sdkFileConfig = getSdkConfig(nitro)

  // Write external types
  const typesPath = resolveFilePath(
    service.paths?.types ?? typesConfig.external,
    typesConfig.enabled,
    true,
    '{typesDir}/nitro-graphql-client-{serviceName}.d.ts',
    placeholders,
  )
  if (typesPath) {
    writeFile(typesPath, types.types)
    if (!options.silent)
      consola.success(`[${service.name}] Types: ${typesPath}`)
  }

  // Write external SDK
  const sdkPath = resolveFilePath(
    service.paths?.sdk ?? sdkFileConfig.external,
    sdkFileConfig.enabled,
    true,
    '{clientDir}/{serviceName}/sdk.ts',
    placeholders,
  )
  if (sdkPath) {
    writeFile(sdkPath, types.sdk)
    if (!options.silent)
      consola.success(`[${service.name}] SDK: ${sdkPath}`)
  }
}

export async function generateExternalTypes(
  nitro: Nitro,
  options: { silent?: boolean } = {},
): Promise<void> {
  const services = nitro.options.graphql?.externalServices || []
  await Promise.all(
    services.map(service =>
      generateExternalServiceTypes(nitro, service, options).catch((error) => {
        consola.error(`[${service.name}] External service failed:`, error)
      }),
    ),
  )
}

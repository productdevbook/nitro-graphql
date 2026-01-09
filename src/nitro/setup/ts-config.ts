/**
 * TypeScript configuration and path aliases setup
 * Registers #graphql/server, #graphql/client, and external service type paths
 */

import type { Nitro, NitroTypes } from 'nitro/types'
import { dirname, join, resolve } from 'pathe'
import { relativeWithDot } from '../../core'
import {
  getDefaultPaths,
  getTypesConfig,
  resolveFilePath,
} from '../paths'

/**
 * Setup TypeScript path aliases for GraphQL types
 * Called via nitro:config hook to extend tsconfig.json
 */
export function setupTypeScriptPaths(nitro: Nitro, types: NitroTypes): void {
  const tsConfigPath = resolve(
    nitro.options.buildDir,
    nitro.options.typescript.tsconfigPath ?? 'tsconfig.json',
  )
  const tsconfigDir = dirname(tsConfigPath)

  // Initialize TypeScript config structures
  types.tsConfig ||= {}
  types.tsConfig.compilerOptions ??= {}
  types.tsConfig.compilerOptions.paths ??= {}
  types.tsConfig.include = types.tsConfig.include || []

  // Resolve paths using the same logic as type generation
  const placeholders = getDefaultPaths(nitro)
  const typesConfig = getTypesConfig(nitro)

  // Setup server types path (#graphql/server)
  setupServerTypesPath(nitro, types, tsconfigDir, placeholders, typesConfig)

  // Setup client types path (#graphql/client)
  setupClientTypesPath(nitro, types, tsconfigDir, placeholders, typesConfig)

  // Setup schema path (#graphql/schema)
  setupSchemaPath(nitro, types, tsconfigDir)

  // Setup external service paths (#graphql/client/{serviceName})
  setupExternalServicePaths(nitro, types, tsconfigDir, placeholders, typesConfig)

  // Add graphql.d.ts to include
  types.tsConfig.include.push(
    relativeWithDot(tsconfigDir, join(placeholders.typesDir, 'graphql.d.ts')),
  )
}

/**
 * Setup #graphql/server path alias
 */
function setupServerTypesPath(
  nitro: Nitro,
  types: NitroTypes,
  tsconfigDir: string,
  placeholders: ReturnType<typeof getDefaultPaths>,
  typesConfig: ReturnType<typeof getTypesConfig>,
): void {
  const serverTypesPath = resolveFilePath(
    typesConfig.server,
    typesConfig.enabled,
    true,
    '{typesDir}/nitro-graphql-server.d.ts',
    placeholders,
  )

  if (serverTypesPath) {
    types.tsConfig!.compilerOptions!.paths!['#graphql/server'] = [
      relativeWithDot(tsconfigDir, serverTypesPath),
    ]
    types.tsConfig!.include!.push(relativeWithDot(tsconfigDir, serverTypesPath))
  }
}

/**
 * Setup #graphql/client path alias
 */
function setupClientTypesPath(
  nitro: Nitro,
  types: NitroTypes,
  tsconfigDir: string,
  placeholders: ReturnType<typeof getDefaultPaths>,
  typesConfig: ReturnType<typeof getTypesConfig>,
): void {
  const clientTypesPath = resolveFilePath(
    typesConfig.client,
    typesConfig.enabled,
    true,
    '{typesDir}/nitro-graphql-client.d.ts',
    placeholders,
  )

  if (clientTypesPath) {
    types.tsConfig!.compilerOptions!.paths!['#graphql/client'] = [
      relativeWithDot(tsconfigDir, clientTypesPath),
    ]
    types.tsConfig!.include!.push(relativeWithDot(tsconfigDir, clientTypesPath))
  }
}

/**
 * Setup #graphql/schema path alias
 */
function setupSchemaPath(
  nitro: Nitro,
  types: NitroTypes,
  tsconfigDir: string,
): void {
  // Schema path always uses serverDir
  types.tsConfig!.compilerOptions!.paths!['#graphql/schema'] = [
    relativeWithDot(tsconfigDir, join(nitro.graphql.serverDir, 'schema.ts')),
  ]
}

/**
 * Setup #graphql/client/{serviceName} path aliases for external services
 */
function setupExternalServicePaths(
  nitro: Nitro,
  types: NitroTypes,
  tsconfigDir: string,
  placeholders: ReturnType<typeof getDefaultPaths>,
  typesConfig: ReturnType<typeof getTypesConfig>,
): void {
  if (!nitro.options.graphql?.externalServices?.length) {
    return
  }

  for (const service of nitro.options.graphql.externalServices) {
    const servicePlaceholders = {
      ...placeholders,
      serviceName: service.name,
    }

    // Resolve external service types path with service-specific override
    const externalTypesPath = resolveFilePath(
      service.paths?.types ?? typesConfig.external,
      typesConfig.enabled,
      true,
      '{typesDir}/nitro-graphql-client-{serviceName}.d.ts',
      servicePlaceholders,
    )

    if (externalTypesPath) {
      // Add path alias
      types.tsConfig!.compilerOptions!.paths![`#graphql/client/${service.name}`] = [
        relativeWithDot(tsconfigDir, externalTypesPath),
      ]
      // Add to include
      types.tsConfig!.include!.push(relativeWithDot(tsconfigDir, externalTypesPath))
    }
  }
}

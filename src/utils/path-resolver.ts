import type { Nitro } from 'nitropack/types'
import type {
  ClientUtilsConfig,
  FileGenerationConfig,
  ScaffoldConfig,
  SdkConfig,
  TypesConfig,
} from '../types'
import { isAbsolute, resolve } from 'pathe'

/**
 * Placeholder values for path resolution
 */
export interface PathPlaceholders {
  serviceName?: string
  buildDir: string
  rootDir: string
  framework: 'nuxt' | 'nitro'
  typesDir: string
  serverGraphql: string
  clientGraphql: string
}

/**
 * Replace placeholders in a path string
 * Supports: {serviceName}, {buildDir}, {rootDir}, {framework}, {typesDir}, {serverGraphql}, {clientGraphql}
 */
export function replacePlaceholders(path: string, placeholders: PathPlaceholders): string {
  return path
    .replace(/\{serviceName\}/g, placeholders.serviceName || 'default')
    .replace(/\{buildDir\}/g, placeholders.buildDir)
    .replace(/\{rootDir\}/g, placeholders.rootDir)
    .replace(/\{framework\}/g, placeholders.framework)
    .replace(/\{typesDir\}/g, placeholders.typesDir)
    .replace(/\{serverGraphql\}/g, placeholders.serverGraphql)
    .replace(/\{clientGraphql\}/g, placeholders.clientGraphql)
}

/**
 * Get default paths based on framework and user configuration
 */
export function getDefaultPaths(nitro: Nitro): Required<PathPlaceholders> {
  const isNuxt = nitro.options.framework?.name === 'nuxt'
  const rootDir = nitro.options.rootDir
  const buildDir = nitro.options.buildDir

  // Global path overrides from config
  const pathsConfig = nitro.options.graphql?.paths || {}

  const defaultServerGraphql = pathsConfig.serverGraphql || resolve(rootDir, 'server', 'graphql')
  const defaultClientGraphql = pathsConfig.clientGraphql || resolve(rootDir, isNuxt ? 'app/graphql' : 'graphql')
  const defaultBuildDir = pathsConfig.buildDir || buildDir
  const defaultTypesDir = pathsConfig.typesDir || resolve(defaultBuildDir, 'types')

  return {
    serviceName: 'default',
    buildDir: defaultBuildDir,
    rootDir,
    framework: isNuxt ? 'nuxt' : 'nitro',
    typesDir: defaultTypesDir,
    serverGraphql: defaultServerGraphql,
    clientGraphql: defaultClientGraphql,
  }
}

/**
 * Check if a file should be generated based on config
 * Returns: true if should generate, false if should skip
 */
export function shouldGenerateFile(
  config: FileGenerationConfig | undefined,
  categoryEnabled: boolean | undefined,
  topLevelEnabled: boolean,
): boolean {
  // Priority 1: Specific file config
  if (config === false)
    return false
  if (config === true || typeof config === 'string')
    return true

  // Priority 2: Category enabled
  if (categoryEnabled === false)
    return false
  if (categoryEnabled === true)
    return true

  // Priority 3: Top-level enabled (default behavior)
  return topLevelEnabled
}

/**
 * Resolve the file path based on configuration
 * Returns: resolved absolute path or null if file should not be generated
 */
export function resolveFilePath(
  config: FileGenerationConfig | undefined,
  categoryEnabled: boolean | undefined,
  topLevelEnabled: boolean,
  defaultPath: string,
  placeholders: PathPlaceholders,
): string | null {
  // Check if should generate
  if (!shouldGenerateFile(config, categoryEnabled, topLevelEnabled)) {
    return null
  }

  // If config is a custom path, use it
  if (typeof config === 'string') {
    const customPath = replacePlaceholders(config, placeholders)
    // If already absolute, use as-is; if relative, resolve against rootDir
    return isAbsolute(customPath) ? customPath : resolve(placeholders.rootDir, customPath)
  }

  // Use default path with placeholder support
  const resolvedDefault = replacePlaceholders(defaultPath, placeholders)
  return resolve(placeholders.rootDir, resolvedDefault)
}

/**
 * Check if scaffold files should be generated (category-level check)
 */
export function shouldGenerateScaffold(nitro: Nitro): boolean {
  const scaffoldConfig = nitro.options.graphql?.scaffold

  // If scaffold is explicitly false, skip all
  if (scaffoldConfig === false)
    return false

  // If scaffold.enabled is explicitly false, skip all
  if (scaffoldConfig && scaffoldConfig.enabled === false)
    return false

  // Default: generate scaffold files
  return true
}

/**
 * Get scaffold configuration (handles false case)
 */
export function getScaffoldConfig(nitro: Nitro): ScaffoldConfig {
  const scaffoldConfig = nitro.options.graphql?.scaffold
  if (scaffoldConfig === false) {
    return { enabled: false }
  }
  return scaffoldConfig || {}
}

/**
 * Check if client utilities should be generated (category-level check)
 */
export function shouldGenerateClientUtils(nitro: Nitro): boolean {
  const clientUtilsConfig = nitro.options.graphql?.clientUtils

  // If clientUtils is explicitly false, skip all
  if (clientUtilsConfig === false)
    return false

  // If clientUtils.enabled is explicitly false, skip all
  if (clientUtilsConfig && clientUtilsConfig.enabled === false)
    return false

  // Default: generate client utils (only for Nuxt)
  return nitro.options.framework?.name === 'nuxt'
}

/**
 * Get client utilities configuration (handles false case)
 */
export function getClientUtilsConfig(nitro: Nitro): ClientUtilsConfig {
  const clientUtilsConfig = nitro.options.graphql?.clientUtils
  if (clientUtilsConfig === false) {
    return { enabled: false }
  }
  return clientUtilsConfig || {}
}

/**
 * Check if SDK files should be generated (category-level check)
 */
export function shouldGenerateSDK(nitro: Nitro): boolean {
  const sdkConfig = nitro.options.graphql?.sdk

  // If sdk is explicitly false, skip all
  if (sdkConfig === false)
    return false

  // If sdk.enabled is explicitly false, skip all
  if (sdkConfig && sdkConfig.enabled === false)
    return false

  // Default: generate SDK files
  return true
}

/**
 * Get SDK configuration (handles false case)
 */
export function getSdkConfig(nitro: Nitro): SdkConfig {
  const sdkConfig = nitro.options.graphql?.sdk
  if (sdkConfig === false) {
    return { enabled: false }
  }
  return sdkConfig || {}
}

/**
 * Check if type files should be generated (category-level check)
 */
export function shouldGenerateTypes(nitro: Nitro): boolean {
  const typesConfig = nitro.options.graphql?.types

  // If types is explicitly false, skip all
  if (typesConfig === false)
    return false

  // If types.enabled is explicitly false, skip all
  if (typesConfig && typesConfig.enabled === false)
    return false

  // Default: generate type files
  return true
}

/**
 * Get types configuration (handles false case)
 */
export function getTypesConfig(nitro: Nitro): TypesConfig {
  const typesConfig = nitro.options.graphql?.types
  if (typesConfig === false) {
    return { enabled: false }
  }
  return typesConfig || {}
}

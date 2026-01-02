import type { Nitro } from 'nitro/types'
import type {
  FileGenerationConfig,
  SdkConfig,
  TypesConfig,
} from './types'
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
  serverDir: string
  clientDir: string
}

/**
 * Replace placeholders in a path string
 * Supports: {serviceName}, {buildDir}, {rootDir}, {framework}, {typesDir}, {serverDir}, {clientDir}
 */
export function replacePlaceholders(path: string, placeholders: PathPlaceholders): string {
  return path
    .replace(/\{serviceName\}/g, placeholders.serviceName || 'default')
    .replace(/\{buildDir\}/g, placeholders.buildDir)
    .replace(/\{rootDir\}/g, placeholders.rootDir)
    .replace(/\{framework\}/g, placeholders.framework)
    .replace(/\{typesDir\}/g, placeholders.typesDir)
    .replace(/\{serverDir\}/g, placeholders.serverDir)
    .replace(/\{clientDir\}/g, placeholders.clientDir)
}

/**
 * Get default paths based on framework and user configuration
 */
export function getDefaultPaths(nitro: Nitro): Required<PathPlaceholders> {
  const isNuxt = nitro.options.framework?.name === 'nuxt'
  const rootDir = nitro.options.rootDir
  const buildDir = nitro.options.buildDir

  // Path overrides from top-level config
  const graphqlConfig = nitro.options.graphql || {}

  const defaultServerDir = graphqlConfig.serverDir || resolve(rootDir, 'server', 'graphql')
  const defaultClientDir = graphqlConfig.clientDir || resolve(rootDir, isNuxt ? 'app/graphql' : 'graphql')
  const defaultTypesDir = graphqlConfig.typesDir || resolve(buildDir, 'types')

  return {
    serviceName: 'default',
    buildDir,
    rootDir,
    framework: isNuxt ? 'nuxt' : 'nitro',
    typesDir: defaultTypesDir,
    serverDir: defaultServerDir,
    clientDir: defaultClientDir,
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
 * Check if SDK files should be generated (category-level check)
 */
export function shouldGenerateSdk(nitro: Nitro): boolean {
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

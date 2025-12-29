/**
 * nitro-graphql main entry point
 */

// Default export: Nitro/Vite plugin
export { default } from './nitro'

// Named exports
export {
  NitroAdapter,
  resolveSecurityConfig,
  setupNitroGraphQL,
} from './nitro'

// Type exports
export type {
  ExternalGraphQLService,
  NitroGraphQLOptions,
  SecurityConfig,
} from './nitro'

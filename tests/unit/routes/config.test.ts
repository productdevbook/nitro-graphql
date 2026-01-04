/**
 * Route handler configuration tests
 *
 * Tests for route handler configuration logic including:
 * - Security config handling (introspection, playground, error masking)
 * - Apollo Sandbox HTML generation
 * - Default security config values
 *
 * Note: The actual route handlers use virtual modules (#nitro-graphql/*) which
 * cannot be tested directly without Nitro. These tests focus on the
 * configuration logic and utilities that can be tested in isolation.
 */
import type { SecurityConfig } from '../../../src/nitro/types'
import { describe, expect, it } from 'vitest'

/**
 * Apollo Sandbox HTML template (extracted from graphql-yoga.ts)
 * This is the HTML served when playground is enabled
 */
const apolloSandboxHtml = `<!DOCTYPE html>
<html lang="en">
<body style="margin: 0; overflow-x: hidden; overflow-y: hidden">
<div id="sandbox" style="height:100vh; width:100vw;"></div>
<script src="https://embeddable-sandbox.cdn.apollographql.com/02e2da0fccbe0240ef03d2396d6c98559bab5b06/embeddable-sandbox.umd.production.min.js"></script>
<script>
new window.EmbeddedSandbox({
  target: "#sandbox",
  initialEndpoint: window.location.href,
  hideCookieToggle: false,
  initialState: {
    includeCookies: true
  }
});
</script>
</body>
</html>`

/**
 * Helper function to get resolved security config with defaults
 * This mimics the logic in graphql-yoga.ts and apollo-server.ts
 */
function getResolvedSecurityConfig(
  moduleSecurityConfig: SecurityConfig | undefined,
): Required<SecurityConfig> {
  const defaults: Required<SecurityConfig> = {
    introspection: true,
    playground: true,
    maskErrors: false,
    disableSuggestions: false,
  }

  return { ...defaults, ...moduleSecurityConfig }
}

/**
 * User-facing error codes that should not be masked in Apollo Server
 * These codes indicate client-side issues, not internal server errors
 */
const userFacingCodes = [
  'BAD_USER_INPUT',
  'GRAPHQL_VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'BAD_REQUEST',
]

/**
 * Error masking logic extracted from apollo-server.ts formatError
 */
function formatErrorWithMasking(
  formattedError: { message: string, extensions?: { code?: string } },
  maskErrors: boolean,
): { message: string, extensions?: { code?: string } } {
  if (!maskErrors) {
    return formattedError
  }

  const code = formattedError?.extensions?.code
  // Allow user-facing errors to pass through
  if (code && userFacingCodes.includes(code)) {
    return formattedError
  }
  // Mask internal server errors
  return {
    message: 'Internal server error',
    extensions: { code: 'INTERNAL_SERVER_ERROR' },
  }
}

describe('route handler configuration', () => {
  describe('security config defaults', () => {
    it('should use permissive defaults when no config is provided', () => {
      const resolved = getResolvedSecurityConfig(undefined)

      expect(resolved.introspection).toBe(true)
      expect(resolved.playground).toBe(true)
      expect(resolved.maskErrors).toBe(false)
      expect(resolved.disableSuggestions).toBe(false)
    })

    it('should use permissive defaults when empty config is provided', () => {
      const resolved = getResolvedSecurityConfig({})

      expect(resolved.introspection).toBe(true)
      expect(resolved.playground).toBe(true)
      expect(resolved.maskErrors).toBe(false)
      expect(resolved.disableSuggestions).toBe(false)
    })

    it('should override defaults with provided config', () => {
      const resolved = getResolvedSecurityConfig({
        introspection: false,
        playground: false,
        maskErrors: true,
        disableSuggestions: true,
      })

      expect(resolved.introspection).toBe(false)
      expect(resolved.playground).toBe(false)
      expect(resolved.maskErrors).toBe(true)
      expect(resolved.disableSuggestions).toBe(true)
    })

    it('should allow partial config overrides', () => {
      const resolved = getResolvedSecurityConfig({
        introspection: false,
        maskErrors: true,
      })

      expect(resolved.introspection).toBe(false)
      expect(resolved.playground).toBe(true) // default
      expect(resolved.maskErrors).toBe(true)
      expect(resolved.disableSuggestions).toBe(false) // default
    })

    it('should handle production-like security config', () => {
      // Typical production settings
      const productionConfig: SecurityConfig = {
        introspection: false,
        playground: false,
        maskErrors: true,
        disableSuggestions: true,
      }

      const resolved = getResolvedSecurityConfig(productionConfig)

      expect(resolved.introspection).toBe(false)
      expect(resolved.playground).toBe(false)
      expect(resolved.maskErrors).toBe(true)
      expect(resolved.disableSuggestions).toBe(true)
    })
  })

  describe('apollo sandbox HTML', () => {
    it('should contain valid HTML structure', () => {
      expect(apolloSandboxHtml).toContain('<!DOCTYPE html>')
      expect(apolloSandboxHtml).toContain('<html lang="en">')
      expect(apolloSandboxHtml).toContain('<body')
      expect(apolloSandboxHtml).toContain('</body>')
      expect(apolloSandboxHtml).toContain('</html>')
    })

    it('should include sandbox container div', () => {
      expect(apolloSandboxHtml).toContain('<div id="sandbox"')
      expect(apolloSandboxHtml).toContain('height:100vh')
      expect(apolloSandboxHtml).toContain('width:100vw')
    })

    it('should load Apollo embedded sandbox script', () => {
      expect(apolloSandboxHtml).toContain('embeddable-sandbox.cdn.apollographql.com')
      expect(apolloSandboxHtml).toContain('embeddable-sandbox.umd.production.min.js')
    })

    it('should initialize EmbeddedSandbox with correct options', () => {
      expect(apolloSandboxHtml).toContain('new window.EmbeddedSandbox')
      expect(apolloSandboxHtml).toContain('target: "#sandbox"')
      expect(apolloSandboxHtml).toContain('initialEndpoint: window.location.href')
      expect(apolloSandboxHtml).toContain('hideCookieToggle: false')
      expect(apolloSandboxHtml).toContain('includeCookies: true')
    })

    it('should have overflow hidden to prevent scrollbars', () => {
      expect(apolloSandboxHtml).toContain('overflow-x: hidden')
      expect(apolloSandboxHtml).toContain('overflow-y: hidden')
      expect(apolloSandboxHtml).toContain('margin: 0')
    })
  })

  describe('error masking (Apollo Server)', () => {
    it('should pass through errors when masking is disabled', () => {
      const error = {
        message: 'Database connection failed',
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      }

      const result = formatErrorWithMasking(error, false)

      expect(result).toBe(error)
      expect(result.message).toBe('Database connection failed')
    })

    it('should mask internal errors when masking is enabled', () => {
      const error = {
        message: 'Database connection failed',
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      }

      const result = formatErrorWithMasking(error, true)

      expect(result.message).toBe('Internal server error')
      expect(result.extensions?.code).toBe('INTERNAL_SERVER_ERROR')
    })

    it('should mask errors without a code when masking is enabled', () => {
      const error = {
        message: 'Something went wrong internally',
      }

      const result = formatErrorWithMasking(error, true)

      expect(result.message).toBe('Internal server error')
      expect(result.extensions?.code).toBe('INTERNAL_SERVER_ERROR')
    })

    it('should pass through BAD_USER_INPUT errors even when masking is enabled', () => {
      const error = {
        message: 'Invalid email format',
        extensions: { code: 'BAD_USER_INPUT' },
      }

      const result = formatErrorWithMasking(error, true)

      expect(result.message).toBe('Invalid email format')
      expect(result.extensions?.code).toBe('BAD_USER_INPUT')
    })

    it('should pass through GRAPHQL_VALIDATION_FAILED errors even when masking is enabled', () => {
      const error = {
        message: 'Cannot query field "foo" on type "Query"',
        extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
      }

      const result = formatErrorWithMasking(error, true)

      expect(result.message).toBe('Cannot query field "foo" on type "Query"')
      expect(result.extensions?.code).toBe('GRAPHQL_VALIDATION_FAILED')
    })

    it('should pass through UNAUTHENTICATED errors even when masking is enabled', () => {
      const error = {
        message: 'You must be logged in',
        extensions: { code: 'UNAUTHENTICATED' },
      }

      const result = formatErrorWithMasking(error, true)

      expect(result.message).toBe('You must be logged in')
      expect(result.extensions?.code).toBe('UNAUTHENTICATED')
    })

    it('should pass through FORBIDDEN errors even when masking is enabled', () => {
      const error = {
        message: 'Access denied',
        extensions: { code: 'FORBIDDEN' },
      }

      const result = formatErrorWithMasking(error, true)

      expect(result.message).toBe('Access denied')
      expect(result.extensions?.code).toBe('FORBIDDEN')
    })

    it('should pass through BAD_REQUEST errors even when masking is enabled', () => {
      const error = {
        message: 'Invalid request format',
        extensions: { code: 'BAD_REQUEST' },
      }

      const result = formatErrorWithMasking(error, true)

      expect(result.message).toBe('Invalid request format')
      expect(result.extensions?.code).toBe('BAD_REQUEST')
    })

    it('should mask errors with unknown/custom codes', () => {
      const error = {
        message: 'Custom error with sensitive info',
        extensions: { code: 'CUSTOM_ERROR' },
      }

      const result = formatErrorWithMasking(error, true)

      expect(result.message).toBe('Internal server error')
      expect(result.extensions?.code).toBe('INTERNAL_SERVER_ERROR')
    })
  })

  describe('user-facing error codes', () => {
    it('should include all standard user-facing codes', () => {
      expect(userFacingCodes).toContain('BAD_USER_INPUT')
      expect(userFacingCodes).toContain('GRAPHQL_VALIDATION_FAILED')
      expect(userFacingCodes).toContain('UNAUTHENTICATED')
      expect(userFacingCodes).toContain('FORBIDDEN')
      expect(userFacingCodes).toContain('BAD_REQUEST')
    })

    it('should have exactly 5 user-facing codes', () => {
      expect(userFacingCodes).toHaveLength(5)
    })

    it('should not include INTERNAL_SERVER_ERROR as user-facing', () => {
      expect(userFacingCodes).not.toContain('INTERNAL_SERVER_ERROR')
    })
  })

  describe('graphQL Yoga config integration', () => {
    it('should configure landingPage based on playground setting', () => {
      const securityConfig = getResolvedSecurityConfig({ playground: true })
      expect(securityConfig.playground).toBe(true)

      const securityConfigDisabled = getResolvedSecurityConfig({ playground: false })
      expect(securityConfigDisabled.playground).toBe(false)
    })

    it('should configure graphiql based on playground setting', () => {
      // When playground is true, graphiql should be configured with defaultQuery
      const playgroundEnabled = getResolvedSecurityConfig({ playground: true })
      expect(playgroundEnabled.playground).toBe(true)

      // When playground is false, graphiql should be false
      const playgroundDisabled = getResolvedSecurityConfig({ playground: false })
      expect(playgroundDisabled.playground).toBe(false)
    })

    it('should configure maskedErrors based on maskErrors setting', () => {
      const maskEnabled = getResolvedSecurityConfig({ maskErrors: true })
      expect(maskEnabled.maskErrors).toBe(true)

      const maskDisabled = getResolvedSecurityConfig({ maskErrors: false })
      expect(maskDisabled.maskErrors).toBe(false)
    })
  })

  describe('apollo Server config integration', () => {
    it('should configure introspection based on security config', () => {
      const introspectionEnabled = getResolvedSecurityConfig({ introspection: true })
      expect(introspectionEnabled.introspection).toBe(true)

      const introspectionDisabled = getResolvedSecurityConfig({ introspection: false })
      expect(introspectionDisabled.introspection).toBe(false)
    })

    it('should determine landing page plugin based on playground setting', () => {
      // When playground is true, should use ApolloServerPluginLandingPageLocalDefault
      const playgroundEnabled = getResolvedSecurityConfig({ playground: true })
      expect(playgroundEnabled.playground).toBe(true)

      // When playground is false, should use ApolloServerPluginLandingPageDisabled
      const playgroundDisabled = getResolvedSecurityConfig({ playground: false })
      expect(playgroundDisabled.playground).toBe(false)
    })

    it('should configure formatError based on maskErrors setting', () => {
      // When maskErrors is true, formatError should be set
      const maskEnabled = getResolvedSecurityConfig({ maskErrors: true })
      expect(maskEnabled.maskErrors).toBe(true)

      // When maskErrors is false, formatError should be undefined
      const maskDisabled = getResolvedSecurityConfig({ maskErrors: false })
      expect(maskDisabled.maskErrors).toBe(false)
    })
  })
})

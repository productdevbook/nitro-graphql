import { describe, expect, it } from 'vitest'
import {
  ENDPOINT_GRAPHQL,
  ENDPOINT_HEALTH,
} from '../../../src/core/constants'
import {
  DEFAULT_RUNTIME_CONFIG,
  DEFAULT_SDK_CONFIG,
  DEFAULT_TYPES_CONFIG,
} from '../../../src/nitro/config'

describe('config/defaults', () => {
  it('should export default types config', () => {
    expect(DEFAULT_TYPES_CONFIG.enabled).toBe(true)
    expect(DEFAULT_TYPES_CONFIG.server).toBeDefined()
    expect(DEFAULT_TYPES_CONFIG.client).toBeDefined()
  })

  it('should export default runtime config with correct endpoints', () => {
    expect(DEFAULT_RUNTIME_CONFIG.endpoint?.graphql).toBe(ENDPOINT_GRAPHQL)
    expect(DEFAULT_RUNTIME_CONFIG.endpoint?.healthCheck).toBe(ENDPOINT_HEALTH)
    expect(DEFAULT_RUNTIME_CONFIG.playground).toBe(true)
  })

  it('should export default SDK config', () => {
    expect(DEFAULT_SDK_CONFIG.enabled).toBe(true)
    expect(DEFAULT_SDK_CONFIG.main).toBe(true)
    expect(DEFAULT_SDK_CONFIG.external).toBe(true)
  })
})

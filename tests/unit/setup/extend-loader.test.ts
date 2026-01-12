/**
 * Unit tests for extend-loader module
 *
 * Tests the extend configuration loading including:
 * - LocalDirExtendSource for Nuxt layers and local directories
 * - Package extends (string paths)
 * - Legacy explicit path extends
 */
import type { Nitro } from 'nitro/types'
import { existsSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveExtendDirs } from '../../../src/nitro/setup/extend-loader'

// Mock fs
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}))

// Mock core modules
vi.mock('../../../src/core', () => ({
  isLocalPath: vi.fn((path: string) => path.startsWith('./') || path.startsWith('../') || path.startsWith('/')),
  loadPackageConfig: vi.fn(),
  parseDirectiveCall: vi.fn(),
  parseResolverCall: vi.fn(),
  parseSingleFile: vi.fn(),
  resolvePackageFiles: vi.fn(),
}))

describe('extend-loader', () => {
  describe('resolveExtendDirs', () => {
    let mockNitro: Partial<Nitro>

    beforeEach(() => {
      vi.clearAllMocks()

      mockNitro = {
        options: {
          rootDir: '/project',
          graphql: {
            extend: [],
          },
        } as any,
      }
    })

    describe('localDirExtendSource', () => {
      it('should resolve serverDir from LocalDirExtendSource', async () => {
        vi.mocked(existsSync).mockReturnValue(true)

        mockNitro.options!.graphql = {
          extend: [
            {
              serverDir: '/layers/base/server/graphql',
            },
          ],
        } as any

        const dirs = await resolveExtendDirs(mockNitro as Nitro)

        expect(dirs).toContain('/layers/base/server/graphql')
      })

      it('should resolve clientDir from LocalDirExtendSource', async () => {
        vi.mocked(existsSync).mockReturnValue(true)

        mockNitro.options!.graphql = {
          extend: [
            {
              clientDir: '/layers/base/app/graphql',
            },
          ],
        } as any

        const dirs = await resolveExtendDirs(mockNitro as Nitro)

        expect(dirs).toContain('/layers/base/app/graphql')
      })

      it('should resolve both serverDir and clientDir', async () => {
        vi.mocked(existsSync).mockReturnValue(true)

        mockNitro.options!.graphql = {
          extend: [
            {
              serverDir: '/layers/base/server/graphql',
              clientDir: '/layers/base/app/graphql',
            },
          ],
        } as any

        const dirs = await resolveExtendDirs(mockNitro as Nitro)

        expect(dirs).toContain('/layers/base/server/graphql')
        expect(dirs).toContain('/layers/base/app/graphql')
      })

      it('should skip non-existent directories', async () => {
        vi.mocked(existsSync).mockReturnValue(false)

        mockNitro.options!.graphql = {
          extend: [
            {
              serverDir: '/layers/base/server/graphql',
              clientDir: '/layers/base/app/graphql',
            },
          ],
        } as any

        const dirs = await resolveExtendDirs(mockNitro as Nitro)

        expect(dirs).toHaveLength(0)
      })

      it('should handle multiple LocalDirExtendSource entries', async () => {
        vi.mocked(existsSync).mockReturnValue(true)

        mockNitro.options!.graphql = {
          extend: [
            {
              serverDir: '/layers/base/server/graphql',
            },
            {
              serverDir: '/layers/theme/server/graphql',
              clientDir: '/layers/theme/app/graphql',
            },
          ],
        } as any

        const dirs = await resolveExtendDirs(mockNitro as Nitro)

        expect(dirs).toContain('/layers/base/server/graphql')
        expect(dirs).toContain('/layers/theme/server/graphql')
        expect(dirs).toContain('/layers/theme/app/graphql')
      })

      it('should deduplicate directories', async () => {
        vi.mocked(existsSync).mockReturnValue(true)

        mockNitro.options!.graphql = {
          extend: [
            {
              serverDir: '/layers/base/server/graphql',
            },
            {
              serverDir: '/layers/base/server/graphql', // duplicate
            },
          ],
        } as any

        const dirs = await resolveExtendDirs(mockNitro as Nitro)

        const count = dirs.filter(d => d === '/layers/base/server/graphql').length
        expect(count).toBe(1)
      })
    })

    describe('empty/undefined extend', () => {
      it('should return empty array when extend is undefined', async () => {
        mockNitro.options!.graphql = {} as any

        const dirs = await resolveExtendDirs(mockNitro as Nitro)

        expect(dirs).toEqual([])
      })

      it('should return empty array when extend is empty', async () => {
        mockNitro.options!.graphql = {
          extend: [],
        } as any

        const dirs = await resolveExtendDirs(mockNitro as Nitro)

        expect(dirs).toEqual([])
      })

      it('should return empty array when graphql options is undefined', async () => {
        mockNitro.options!.graphql = undefined as any

        const dirs = await resolveExtendDirs(mockNitro as Nitro)

        expect(dirs).toEqual([])
      })
    })

    describe('mixed extend sources', () => {
      it('should handle mix of LocalDirExtendSource and string paths', async () => {
        const { loadPackageConfig } = await import('../../../src/core')
        vi.mocked(loadPackageConfig).mockResolvedValue({
          baseDir: '/node_modules/@org/graphql-pkg',
          config: { serverDir: 'server/graphql' },
        } as any)
        vi.mocked(existsSync).mockReturnValue(true)

        mockNitro.options!.graphql = {
          extend: [
            '@org/graphql-pkg', // string package path
            {
              serverDir: '/layers/base/server/graphql',
            },
          ],
        } as any

        const dirs = await resolveExtendDirs(mockNitro as Nitro)

        expect(dirs).toContain('/node_modules/@org/graphql-pkg/server/graphql')
        expect(dirs).toContain('/layers/base/server/graphql')
      })
    })

    describe('package extends with clientDir', () => {
      it('should resolve clientDir from package config', async () => {
        const { loadPackageConfig } = await import('../../../src/core')
        vi.mocked(loadPackageConfig).mockResolvedValue({
          baseDir: '/node_modules/@org/graphql-pkg',
          config: {
            serverDir: 'server/graphql',
            clientDir: '../../apps/main/app/graphql',
          },
        } as any)
        vi.mocked(existsSync).mockReturnValue(true)

        mockNitro.options!.graphql = {
          extend: ['@org/graphql-pkg'],
        } as any

        const dirs = await resolveExtendDirs(mockNitro as Nitro)

        expect(dirs).toContain('/node_modules/@org/graphql-pkg/server/graphql')
        // ../../apps/main/app/graphql from /node_modules/@org/graphql-pkg resolves to /node_modules/apps/main/app/graphql
        expect(dirs).toContain('/node_modules/apps/main/app/graphql')
      })

      it('should resolve clientDir with relative parent path from package', async () => {
        const { loadPackageConfig } = await import('../../../src/core')
        vi.mocked(loadPackageConfig).mockResolvedValue({
          baseDir: '/monorepo/packages/graphql',
          config: {
            serverDir: './',
            clientDir: '../../apps/ecommerce/app/graphql',
          },
        } as any)
        vi.mocked(existsSync).mockReturnValue(true)

        mockNitro.options!.graphql = {
          extend: ['@org/graphql-pkg'],
        } as any

        const dirs = await resolveExtendDirs(mockNitro as Nitro)

        expect(dirs).toContain('/monorepo/packages/graphql')
        expect(dirs).toContain('/monorepo/apps/ecommerce/app/graphql')
      })

      it('should handle package with only clientDir configured', async () => {
        const { loadPackageConfig } = await import('../../../src/core')
        vi.mocked(loadPackageConfig).mockResolvedValue({
          baseDir: '/node_modules/@org/graphql-pkg',
          config: {
            clientDir: 'client/graphql',
          },
        } as any)
        vi.mocked(existsSync).mockReturnValue(true)

        mockNitro.options!.graphql = {
          extend: ['@org/graphql-pkg'],
        } as any

        const dirs = await resolveExtendDirs(mockNitro as Nitro)

        // Should still have default serverDir
        expect(dirs).toContain('/node_modules/@org/graphql-pkg/server/graphql')
        // Should also have clientDir
        expect(dirs).toContain('/node_modules/@org/graphql-pkg/client/graphql')
      })
    })
  })
})

import { execSync } from 'node:child_process'
/**
 * E2E tests for CLI generate command with custom types path
 *
 * This test actually runs the CLI and verifies that types are generated
 * at the custom path specified in nitro-graphql.config.ts
 */
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'pathe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const fixturesDir = resolve(__dirname, '../fixtures')
const projectDir = resolve(fixturesDir, 'cli-custom-types')

// Clean up generated files
function cleanupGeneratedFiles() {
  const dirsToClean = [
    join(projectDir, '.nitro-graphql'),
    join(projectDir, 'custom-types'),
    join(projectDir, 'graphql/default'),
  ]

  for (const dir of dirsToClean) {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true })
    }
  }
}

describe('cLI Generate with Custom Types Path E2E', () => {
  beforeAll(() => {
    cleanupGeneratedFiles()
  })

  afterAll(() => {
    cleanupGeneratedFiles()
  })

  describe('nitro-graphql generate command', () => {
    it('should generate types at custom paths specified in config', () => {
      // Run CLI generate command
      const cliPath = resolve(__dirname, '../../dist/cli/index.mjs')

      try {
        execSync(`node ${cliPath} generate`, {
          cwd: projectDir,
          stdio: 'pipe',
          env: { ...process.env, NODE_ENV: 'test' },
        })
      }
      catch (error: any) {
        console.error('CLI stdout:', error.stdout?.toString())
        console.error('CLI stderr:', error.stderr?.toString())
        throw error
      }

      // Check that types were generated at custom paths
      const customServerPath = join(projectDir, 'custom-types/server.d.ts')
      const customClientPath = join(projectDir, 'custom-types/client.d.ts')

      expect(existsSync(customServerPath)).toBe(true)
      expect(existsSync(customClientPath)).toBe(true)

      // Verify content
      const serverContent = readFileSync(customServerPath, 'utf-8')
      expect(serverContent).toContain('Query')
      expect(serverContent).toContain('User')

      const clientContent = readFileSync(customClientPath, 'utf-8')
      expect(clientContent).toContain('GetUser')
      expect(clientContent).toContain('GetHello')
    })

    it('should NOT generate types at default path when custom path is configured', () => {
      const defaultServerPath = join(projectDir, '.nitro-graphql/types/nitro-graphql-server.d.ts')
      const defaultClientPath = join(projectDir, '.nitro-graphql/types/nitro-graphql-client.d.ts')

      // Default paths should NOT exist
      expect(existsSync(defaultServerPath)).toBe(false)
      expect(existsSync(defaultClientPath)).toBe(false)
    })
  })
})

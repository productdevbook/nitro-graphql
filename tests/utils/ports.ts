/**
 * Dynamic port allocation for tests
 *
 * Uses get-port to find available ports and avoid conflicts
 * when running tests in parallel.
 */

import getPort from 'get-port'

// Track allocated ports to avoid reuse within same test run
const allocatedPorts = new Set<number>()

/**
 * Get an available port for testing
 * Ensures no port conflicts when tests run in parallel
 */
export async function getTestPort(): Promise<number> {
  const port = await getPort({
    exclude: [...allocatedPorts],
  })
  allocatedPorts.add(port)
  return port
}

/**
 * Release a port after test is done
 */
export function releasePort(port: number): void {
  allocatedPorts.delete(port)
}

/**
 * Get multiple available ports at once
 */
export async function getTestPorts(count: number): Promise<number[]> {
  const ports: number[] = []
  for (let i = 0; i < count; i++) {
    ports.push(await getTestPort())
  }
  return ports
}

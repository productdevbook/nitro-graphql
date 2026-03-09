/**
 * External services validation utilities
 * Framework-agnostic validation helpers
 */

const VALID_IDENTIFIER_RE = /^[a-z]\w*$/i

/**
 * Validate external GraphQL service configuration
 */
export function validateExternalServices(services: unknown[]): string[] {
  const errors: string[] = []
  const serviceNames = new Set<string>()

  for (const [index, service] of services.entries()) {
    const prefix = `externalServices[${index}]`

    // Type guard: ensure service is an object
    if (!service || typeof service !== 'object') {
      errors.push(`${prefix} must be an object`)
      continue
    }

    // Check required fields
    if (!('name' in service) || typeof service.name !== 'string') {
      errors.push(`${prefix}.name is required and must be a string`)
    }
    else if (serviceNames.has(service.name)) {
      errors.push(`${prefix}.name "${service.name}" must be unique`)
    }
    else {
      serviceNames.add(service.name)
    }

    if (!('endpoint' in service) || typeof service.endpoint !== 'string') {
      errors.push(`${prefix}.endpoint is required and must be a string`)
    }
    else {
      // Basic URL validation
      try {
        const url = new URL(service.endpoint)
        // URL is valid if we reach this point
        void url
      }
      catch {
        errors.push(`${prefix}.endpoint "${service.endpoint}" must be a valid URL`)
      }
    }

    // Validate service name format (should be valid for file names and TypeScript)
    if ('name' in service && typeof service.name === 'string' && !VALID_IDENTIFIER_RE.test(service.name)) {
      errors.push(`${prefix}.name "${service.name}" must be a valid identifier (letters, numbers, underscore, starting with letter)`)
    }
  }

  return errors
}

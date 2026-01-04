/**
 * Fixture: Resolver file with named exports but no define* functions
 * Should trigger a warning about missing define functions
 */

// Named exports that don't use define* functions
export const myQuery = {
  user: () => ({ id: '1', name: 'Test' }),
}

export const myMutation = {
  createUser: () => ({ id: '1', name: 'New User' }),
}

export function someHelper() {
  return 'helper'
}

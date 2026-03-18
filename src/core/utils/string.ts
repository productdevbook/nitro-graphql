/**
 * Shared string utilities
 */

/**
 * Capitalize the first character of a string (PascalCase first letter)
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Type definitions for Nitro GraphQL documentation metadata system
 * Inspired by VueUse metadata architecture
 */

/**
 * Metadata for a single API function/utility
 */
export interface ApiFunction {
  /** Function name (e.g., "defineResolver") */
  name: string

  /** Category (e.g., "Utilities", "Server", "Client") */
  category?: string

  /** Function description extracted from markdown */
  description?: string

  /** Unix timestamp of last update from git */
  lastUpdated?: number

  /** Related function names */
  related?: string[]

  /** Alternative names/aliases */
  alias?: string[]

  /** Whether the function is deprecated */
  deprecated?: boolean

  /** Export size (e.g., "1.2 kB") */
  exportSize?: string

  /** Documentation path */
  docs?: string

  /** Source file path in repository */
  source?: string

  /** Demo/playground URL */
  demo?: string
}

/**
 * Git commit information
 */
export interface CommitInfo {
  /** Functions affected by this commit */
  functions: string[]

  /** Release version (if this is a release commit) */
  version?: string

  /** Commit hash (short) */
  hash: string

  /** Commit date (ISO string) */
  date: string

  /** Commit message */
  message: string

  /** Author name */
  author: string
}

/**
 * Contributor information for a function
 */
export interface ContributorInfo {
  /** Contributor name */
  name: string

  /** Number of commits */
  count: number

  /** Email (for Gravatar) */
  email: string

  /** GitHub username (extracted from commits or API) */
  github?: string | null

  /** MD5 hash of email (for Gravatar URL) */
  hash?: string
}

/**
 * Category metadata
 */
export interface CategoryInfo {
  /** Category name */
  name: string

  /** Category description */
  description?: string

  /** Category icon/emoji */
  icon?: string

  /** Number of functions in category */
  count: number
}

/**
 * Complete metadata index
 */
export interface MetadataIndex {
  /** All API functions indexed by name */
  functions: Record<string, ApiFunction>

  /** All categories */
  categories: Record<string, CategoryInfo>

  /** Last updated timestamp */
  lastUpdated: number
}

/**
 * Contributors data structure (by function name)
 */
export type ContributorsData = Record<string, ContributorInfo[]>

/**
 * Changelog data structure (by function name)
 */
export type ChangelogData = Record<string, CommitInfo[]>

/**
 * Export sizes data structure (by function name)
 */
export type ExportSizesData = Record<string, string>

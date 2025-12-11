/**
 * Metadata extraction utilities for documentation pages
 */

import type { ApiFunction, CategoryInfo, MetadataIndex } from './types'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import matter from 'gray-matter'

/**
 * Extract metadata from a single markdown file
 */
export function extractFunctionMetadata(
  filePath: string,
  rootDir: string,
): ApiFunction | null {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const { data: frontmatter, content: markdown } = matter(content)

    // Extract function name from filename (e.g., "define-resolver.md" -> "defineResolver")
    const fileName = filePath.split('/').pop()?.replace('.md', '') || ''
    const functionName = frontmatter.title || toCamelCase(fileName)

    // Extract description (first paragraph after title)
    const descMatch = markdown.match(/^#[^\n]+\n+([^\n]+)/)
    const description = descMatch?.[1]?.trim() || frontmatter.description

    // Relative path for docs URL
    const relativePath = relative(rootDir, filePath).replace(/\.md$/, '.html')

    return {
      name: functionName,
      category: frontmatter.category,
      description,
      related: Array.isArray(frontmatter.related)
        ? frontmatter.related
        : frontmatter.related?.split(',').map((s: string) => s.trim()),
      alias: Array.isArray(frontmatter.alias)
        ? frontmatter.alias
        : frontmatter.alias?.split(',').map((s: string) => s.trim()),
      deprecated: frontmatter.deprecated === true,
      docs: `/${relativePath}`,
      source: frontmatter.source,
      demo: frontmatter.demo,
    }
  }
  catch (error) {
    console.warn(`Failed to extract metadata from ${filePath}:`, error)
    return null
  }
}

/**
 * Scan directory recursively for markdown files
 */
export function scanMarkdownFiles(dir: string): string[] {
  const files: string[] = []

  try {
    const entries = readdirSync(dir)

    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)

      if (stat.isDirectory() && !entry.startsWith('.')) {
        // Recursively scan subdirectories
        files.push(...scanMarkdownFiles(fullPath))
      }
      else if (stat.isFile() && entry.endsWith('.md') && entry !== 'index.md') {
        files.push(fullPath)
      }
    }
  }
  catch (error) {
    console.warn(`Failed to scan directory ${dir}:`, error)
  }

  return files
}

/**
 * Build complete metadata index
 */
export function buildMetadataIndex(docsDir: string): MetadataIndex {
  const functionsMap: Record<string, ApiFunction> = {}
  const categoriesMap: Record<string, CategoryInfo> = {}

  // Scan all documentation directories
  const directories = ['api', 'guide', 'ecosystem', 'troubleshooting', 'contributing']

  for (const dir of directories) {
    const dirPath = join(docsDir, dir)
    const files = scanMarkdownFiles(dirPath)

    for (const file of files) {
      const metadata = extractFunctionMetadata(file, docsDir)
      if (metadata) {
        functionsMap[metadata.name] = metadata

        // Track categories
        if (metadata.category) {
          if (!categoriesMap[metadata.category]) {
            categoriesMap[metadata.category] = {
              name: metadata.category,
              count: 0,
            }
          }
          categoriesMap[metadata.category].count++
        }
      }
    }
  }

  return {
    functions: functionsMap,
    categories: categoriesMap,
    lastUpdated: Date.now(),
  }
}

/**
 * Convert kebab-case or snake_case to camelCase
 */
function toCamelCase(str: string): string {
  return str
    .replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase())
    .replace(/^[A-Z]/, letter => letter.toLowerCase())
}

/**
 * Get function name from markdown file path
 */
export function getFunctionNameFromPath(filePath: string): string {
  const fileName = filePath.split('/').pop()?.replace('.md', '') || ''
  return toCamelCase(fileName)
}

/**
 * Extract changelog information from Git history
 */

import type { ChangelogData, CommitInfo } from '../metadata/types'
import { execSync } from 'node:child_process'

/**
 * Get changelog for a specific file (last N commits)
 */
export function getFileChangelog(filePath: string, limit = 10): CommitInfo[] {
  try {
    // Get commits with format: hash|date|author|message|tag (tag might be empty)
    const output = execSync(
      `git log --follow -n ${limit} --format="%h|%aI|%an|%s|%D" -- "${filePath}"`,
      { encoding: 'utf-8', cwd: process.cwd() },
    )

    const commits: CommitInfo[] = []

    for (const line of output.trim().split('\n')) {
      if (!line.trim())
        continue

      const parts = line.split('|')
      const [hash, date, author, message] = parts
      const refs = parts[4] || '' // Git references (tags, branches)

      // Extract version from tag (e.g., "tag: v1.5.0" or "HEAD -> main, tag: v1.5.0")
      const tagMatch = refs.match(/tag:\s*v?(\d+\.\d+\.\d+)/)
      let version = tagMatch?.[1]

      // Fallback: try to extract version from commit message
      if (!version) {
        const versionMatch = message.match(/(?:chore:|release:)?\s*v?(\d+\.\d+\.\d+)/)
        version = versionMatch?.[1]
      }

      commits.push({
        hash: hash.trim(),
        date: date.trim(),
        author: author.trim(),
        message: message.trim(),
        version,
        functions: [], // Will be populated if needed
      })
    }

    return commits
  }
  catch (error) {
    console.warn(`Failed to get changelog for ${filePath}:`, error)
    return []
  }
}

/**
 * Get all version/release commits (like VueUse does)
 */
function getVersionCommits(): CommitInfo[] {
  try {
    const output = execSync(
      'git log --tags --simplify-by-decoration --pretty="%h|%aI|%an|%s|%D"',
      { encoding: 'utf-8', cwd: process.cwd() },
    )

    const commits: CommitInfo[] = []

    for (const line of output.trim().split('\n')) {
      if (!line.trim())
        continue

      const parts = line.split('|')
      const [hash, date, author, message] = parts
      const refs = parts[4] || ''

      // Extract version from tag
      const tagMatch = refs.match(/tag:\s*v?(\d+\.\d+\.\d+)/)
      if (tagMatch) {
        commits.push({
          hash: hash.trim(),
          date: date.trim(),
          author: author.trim(),
          message: message.trim(),
          version: tagMatch[1],
          functions: [],
        })
      }
    }

    return commits
  }
  catch (error) {
    console.warn('Failed to get version commits:', error)
    return []
  }
}

/**
 * Get changelog for all documentation files
 */
export function getAllChangelogs(docsDir: string, limit = 10): ChangelogData {
  // eslint-disable-next-line ts/no-require-imports
  const { join } = require('node:path')
  // eslint-disable-next-line ts/no-require-imports
  const { scanMarkdownFiles, getFunctionNameFromPath } = require('../metadata/extractor')

  // Get all version commits (like VueUse - these are shown on all pages)
  const versionCommits = getVersionCommits()

  const changelogs: ChangelogData = {}
  const directories = ['api', 'guide', 'ecosystem', 'troubleshooting', 'contributing']

  for (const dir of directories) {
    const dirPath = join(docsDir, dir)
    const files = scanMarkdownFiles(dirPath)

    for (const file of files) {
      const functionName = getFunctionNameFromPath(file)
      const fileChangelog = getFileChangelog(file, limit)

      // Merge version commits with file-specific commits
      // Remove duplicates based on hash
      const allCommits = [...fileChangelog, ...versionCommits]
      const uniqueCommits = Array.from(
        new Map(allCommits.map(c => [c.hash, c])).values(),
      ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      if (uniqueCommits.length > 0)
        changelogs[functionName] = uniqueCommits
    }
  }

  return changelogs
}

/**
 * Get last updated timestamp for a file
 */
export function getLastUpdated(filePath: string): number {
  try {
    const output = execSync(
      `git log -1 --format="%at" -- "${filePath}"`,
      { encoding: 'utf-8', cwd: process.cwd() },
    )

    const timestamp = Number.parseInt(output.trim(), 10)
    return timestamp * 1000 // Convert to milliseconds
  }
  catch (error) {
    console.warn(`Failed to get last updated for ${filePath}:`, error)
    return Date.now()
  }
}

/**
 * Format commit message for display (parse conventional commits)
 */
export function formatCommitMessage(message: string): { type: string, scope?: string, subject: string } {
  // Parse: "feat(scope): subject" or "fix: subject"
  const match = message.match(/^(\w+)(?:\(([^)]+)\))?: (.+)$/)

  if (match) {
    const [, type, scope, subject] = match
    return { type, scope, subject }
  }

  return { type: 'chore', subject: message }
}

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
 * Fetch version commits from GitHub Releases API (for shallow clones)
 */
async function fetchGitHubReleases(): Promise<CommitInfo[]> {
  try {
    const response = await fetch(
      'https://api.github.com/repos/productdevbook/nitro-graphql/releases?per_page=20',
      {
        headers: {
          'content-type': 'application/json',
        },
      },
    )

    if (!response.ok) {
      console.warn('GitHub API rate limit or error:', response.status)
      return []
    }

    const releases = await response.json() as Array<{
      tag_name: string
      published_at: string
      author: { login: string }
      name: string
      body: string
    }>

    return releases.map(release => ({
      hash: release.tag_name,
      date: release.published_at,
      author: release.author.login,
      message: release.name || `Release ${release.tag_name}`,
      version: release.tag_name.replace(/^v/, ''),
      functions: [],
    }))
  }
  catch (error) {
    console.warn('Failed to fetch GitHub releases:', error)
    return []
  }
}

/**
 * Get all version/release commits (with GitHub API fallback)
 */
async function getVersionCommits(): Promise<CommitInfo[]> {
  let commits: CommitInfo[] = []

  try {
    const output = execSync(
      'git log --tags --simplify-by-decoration --pretty="%h|%aI|%an|%s|%D"',
      { encoding: 'utf-8', cwd: process.cwd() },
    )

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
  }
  catch {
    console.warn('Git log for tags failed, using GitHub API fallback')
  }

  // If git log returned few/no results (shallow clone), fetch from GitHub API
  if (commits.length < 5) {
    console.log('Using GitHub Releases API for version history (shallow clone detected)')
    const githubReleases = await fetchGitHubReleases()

    // Merge with git results, prefer git data when available
    const commitMap = new Map(commits.map(c => [c.version, c]))
    for (const release of githubReleases) {
      if (release.version && !commitMap.has(release.version)) {
        commitMap.set(release.version, release)
      }
    }

    commits = Array.from(commitMap.values())
  }

  return commits
}

/**
 * Get changelog for all documentation files
 */
export async function getAllChangelogs(docsDir: string, limit = 10): Promise<ChangelogData> {
  // eslint-disable-next-line ts/no-require-imports
  const { join } = require('node:path')
  // eslint-disable-next-line ts/no-require-imports
  const { scanMarkdownFiles, getFunctionNameFromPath } = require('../metadata/extractor')

  // Get all version commits (like VueUse - these are shown on all pages)
  const versionCommits = await getVersionCommits()

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

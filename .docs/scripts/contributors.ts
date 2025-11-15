/**
 * Extract contributor information from GitHub API
 * Based on VueUse's approach - no manual mapping, pure GitHub API
 */

import type { ContributorInfo, ContributorsData } from '../metadata/types'
import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'

/**
 * Fetch contributors from GitHub API (like VueUse does)
 */
async function fetchGitHubContributors(page = 1): Promise<Array<{ login: string, avatar_url: string }>> {
  const collaborators: Array<{ login: string, avatar_url: string }> = []

  try {
    const response = await fetch(
      `https://api.github.com/repos/productdevbook/nitro-graphql/contributors?per_page=100&page=${page}`,
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

    const data = await response.json() as Array<{ login: string, avatar_url: string }>
    collaborators.push(...data.map(i => ({ login: i.login, avatar_url: i.avatar_url })))

    // If we got 100 results, there might be more
    if (data.length === 100)
      collaborators.push(...(await fetchGitHubContributors(page + 1)))
  }
  catch (error) {
    console.warn('Failed to fetch GitHub contributors:', error)
  }

  return collaborators.filter(c => !['renovate[bot]', 'dependabot[bot]', 'renovate-bot'].includes(c.login))
}

/**
 * Match git email/name to GitHub username
 */
function matchGitHubUsername(email: string, name: string, githubUsers: Array<{ login: string, avatar_url: string }>): { login: string, avatar: string } | null {
  // Try to find GitHub username from noreply email
  const githubEmailMatch = email.match(/(\w+)@users\.noreply\.github\.com/)
  if (githubEmailMatch) {
    const username = githubEmailMatch[1]
    const user = githubUsers.find(u => u.login.toLowerCase() === username.toLowerCase())
    if (user)
      return { login: user.login, avatar: user.avatar_url }
  }

  // Try exact name match (case insensitive)
  const nameLower = name.toLowerCase().replace(/\s+/g, '')
  const exactMatch = githubUsers.find(u => u.login.toLowerCase() === nameLower)
  if (exactMatch)
    return { login: exactMatch.login, avatar: exactMatch.avatar_url }

  // Try email prefix match (remove dots and special chars)
  const emailPrefix = email.split('@')[0].toLowerCase().replace(/[.\-_]/g, '')
  const emailMatch = githubUsers.find(u => u.login.toLowerCase().replace(/[.\-_]/g, '') === emailPrefix)
  if (emailMatch)
    return { login: emailMatch.login, avatar: emailMatch.avatar_url }

  // Try partial matches for common patterns
  const emailParts = email.split('@')[0].toLowerCase().split(/[.\-_]/)
  for (const part of emailParts) {
    if (part.length > 3) { // Only match meaningful parts
      const partialMatch = githubUsers.find(u => u.login.toLowerCase().includes(part) || part.includes(u.login.toLowerCase()))
      if (partialMatch)
        return { login: partialMatch.login, avatar: partialMatch.avatar_url }
    }
  }

  return null
}

/**
 * Get contributors for a specific file
 */
export async function getFileContributors(filePath: string, githubUsers: Array<{ login: string, avatar_url: string }>): Promise<ContributorInfo[]> {
  try {
    // Get contributors with commit count using git shortlog
    const output = execSync(
      `git log --follow --format="%an|%ae" -- "${filePath}" | sort | uniq -c | sort -rn`,
      { encoding: 'utf-8', cwd: process.cwd() },
    )

    const contributors: ContributorInfo[] = []

    for (const line of output.trim().split('\n')) {
      if (!line.trim())
        continue

      // Parse: "  5 John Doe|john@example.com"
      // eslint-disable-next-line regexp/no-super-linear-backtracking
      const match = line.trim().match(/^\s*(\d+)\s+(.+?)\|(.+)$/)
      if (match) {
        const [, countStr, name, email] = match
        const count = Number.parseInt(countStr, 10)

        // Match to GitHub username
        const githubMatch = matchGitHubUsername(email, name, githubUsers)

        // Create MD5 hash for Gravatar fallback
        const hash = createHash('md5')
          .update(email.trim().toLowerCase())
          .digest('hex')

        contributors.push({
          name: name.trim(),
          email: email.trim(),
          count,
          github: githubMatch?.login || null,
          hash,
        })
      }
    }

    return contributors
  }
  catch (error) {
    console.warn(`Failed to get contributors for ${filePath}:`, error)
    return []
  }
}

/**
 * Get contributors for all documentation files
 */
export async function getAllContributors(docsDir: string): Promise<ContributorsData> {
  // eslint-disable-next-line ts/no-require-imports
  const { join } = require('node:path')
  // eslint-disable-next-line ts/no-require-imports
  const { scanMarkdownFiles, getFunctionNameFromPath } = require('../metadata/extractor')

  // Fetch GitHub contributors first (like VueUse)
  console.log('🔍 Fetching contributors from GitHub API...')
  const githubUsers = await fetchGitHubContributors()
  console.log(`✓ Found ${githubUsers.length} GitHub contributors`)

  const contributors: ContributorsData = {}
  const directories = ['api', 'guide', 'ecosystem', 'troubleshooting', 'contributing']

  for (const dir of directories) {
    const dirPath = join(docsDir, dir)
    const files = scanMarkdownFiles(dirPath)

    for (const file of files) {
      const functionName = getFunctionNameFromPath(file)
      const fileContributors = await getFileContributors(file, githubUsers)

      if (fileContributors.length > 0)
        contributors[functionName] = fileContributors
    }
  }

  return contributors
}

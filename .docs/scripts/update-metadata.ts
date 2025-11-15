/**
 * Main script to update all metadata
 */

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildMetadataIndex, getFunctionNameFromPath, scanMarkdownFiles } from '../metadata/extractor'
import { getAllChangelogs, getLastUpdated } from './changelog'
import { getAllContributors } from './contributors'

const DOCS_DIR = join(__dirname, '..')

/**
 * Update all metadata files
 */
async function updateMetadata() {
  console.log('🔄 Updating documentation metadata...\n')

  // 1. Build metadata index
  console.log('📋 Building metadata index...')
  const metadataIndex = buildMetadataIndex(DOCS_DIR)

  // 2. Add last updated timestamps from git
  // Scan all directories for markdown files
  const directories = ['api', 'guide', 'ecosystem', 'troubleshooting', 'contributing']

  for (const dir of directories) {
    const dirPath = join(DOCS_DIR, dir)
    const files = scanMarkdownFiles(dirPath)

    for (const file of files) {
      const functionName = getFunctionNameFromPath(file)

      // Case-insensitive match
      const matchingKey = Object.keys(metadataIndex.functions).find(
        key => key.toLowerCase() === functionName.toLowerCase(),
      )

      if (matchingKey) {
        metadataIndex.functions[matchingKey].lastUpdated = getLastUpdated(file)
      }
    }
  }

  // Write metadata index
  const metadataPath = join(DOCS_DIR, 'metadata/index.json')
  writeFileSync(metadataPath, JSON.stringify(metadataIndex, null, 2))
  console.log(`✓ Metadata index: ${Object.keys(metadataIndex.functions).length} functions`)

  // 3. Extract contributors
  console.log('\n👥 Extracting contributors...')
  const contributors = await getAllContributors(DOCS_DIR)
  const contributorsPath = join(DOCS_DIR, 'metadata/contributors.json')
  writeFileSync(contributorsPath, JSON.stringify(contributors, null, 2))
  console.log(`✓ Contributors: ${Object.keys(contributors).length} functions`)

  // 4. Extract changelog
  console.log('\n📝 Extracting changelog...')
  const changelog = await getAllChangelogs(DOCS_DIR, 20) // Increased limit like VueUse
  const changelogPath = join(DOCS_DIR, 'metadata/changelog.json')
  writeFileSync(changelogPath, JSON.stringify(changelog, null, 2))
  console.log(`✓ Changelog: ${Object.keys(changelog).length} functions`)

  console.log('\n✨ Metadata update complete!')
  console.log(`\nFiles generated:`)
  console.log(`  - ${metadataPath}`)
  console.log(`  - ${contributorsPath}`)
  console.log(`  - ${changelogPath}`)
}

// Run
updateMetadata().catch((error) => {
  console.error('Failed to update metadata:', error)
  process.exit(1)
})

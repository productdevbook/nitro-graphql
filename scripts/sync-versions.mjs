import { readFileSync, writeFileSync } from 'node:fs'

// Read the main package.json to get the new version
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const version = pkg.version

// Update optionalDependencies to match
if (pkg.optionalDependencies) {
  for (const dep of Object.keys(pkg.optionalDependencies)) {
    pkg.optionalDependencies[dep] = version
  }
  writeFileSync('package.json', `${JSON.stringify(pkg, null, 2)}\n`)
  console.log(`Updated optionalDependencies to version ${version}`)
}

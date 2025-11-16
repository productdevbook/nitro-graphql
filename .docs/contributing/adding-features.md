---
category: Contributing
---

# Adding Features

<FunctionInfo fn="addingFeatures"/>

This guide walks you through the process of adding new features to Nitro GraphQL, from initial development to submitting a pull request.

## Before You Start

1. **Check existing issues** - Search for related issues or discussions
2. **Open an issue** - Discuss your feature idea before implementing
3. **Get feedback** - Wait for maintainer feedback on larger features
4. **Fork the repo** - Create your own fork to work in

## Development Process

### 1. Set Up Your Environment

Follow the [Development Setup](/contributing/development-setup) guide to get started.

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/nitro-graphql.git
cd nitro-graphql

# Install dependencies
pnpm install

# Start development mode
pnpm dev
```

### 2. Create a Feature Branch

Use descriptive branch names:

```bash
# For new features
git checkout -b feat/your-feature-name

# For bug fixes
git checkout -b fix/bug-description

# For documentation
git checkout -b docs/update-description

# For maintenance
git checkout -b chore/task-description
```

**Examples:**
- `feat/custom-scalars`
- `feat/graphql-shield-integration`
- `fix/type-generation-windows`
- `docs/federation-guide`

### 3. Implement Your Feature

#### File Organization

Place your code in the appropriate location:

```
src/
├── index.ts              # Add module setup code here
├── types/
│   └── index.ts          # Add new type definitions
├── utils/
│   └── your-util.ts      # Add utility functions
├── routes/
│   └── your-route.ts     # Add new route handlers
└── ecosystem/
    └── your-integration.ts  # Add framework integrations
```

#### Code Style

Follow these guidelines:

**TypeScript:**
```typescript
// ✅ Use explicit types for public APIs
// ✅ Use type imports when possible
import type { NitroConfig } from 'nitropack'

export function generateTypes(options: GenerateOptions): Promise<void>

// ✅ Prefer named exports
export function myFunction() {}

// ❌ Avoid default exports (except for route handlers)
export default myFunction // Don't do this
```

**Naming Conventions:**
- **Functions**: `camelCase` - `generateTypes`, `scanSchemas`
- **Types/Interfaces**: `PascalCase` - `GraphQLConfig`, `ResolverOptions`
- **Constants**: `UPPER_SNAKE_CASE` - `DEFAULT_ENDPOINT`, `MAX_RETRIES`
- **Files**: `kebab-case` - `type-generation.ts`, `path-resolver.ts`

**Code Organization:**
```typescript
// Order your code logically:

import type { NitroConfig } from 'nitropack'
// 1. Imports
import { defineNitroModule } from 'nitropack/kit'

// 2. Types and interfaces
export interface FeatureOptions {
  enabled: boolean
}

// 3. Constants
const DEFAULT_OPTIONS: FeatureOptions = {
  enabled: true
}

// 4. Helper functions
function validateOptions(options: FeatureOptions) {
  // ...
}

// 5. Main exported functions
export function setupFeature(options: FeatureOptions) {
  // ...
}
```

#### Testing Your Changes

Test your feature in multiple environments:

**Nitro Playground:**
```bash
# Terminal 1
pnpm dev

# Terminal 2
pnpm playground:nitro
```

**Nuxt Playground:**
```bash
# Terminal 1
pnpm dev

# Terminal 2
pnpm playground:nuxt
```

**Add test cases** to the playground:
```typescript
// playgrounds/nitro/server/graphql/test.resolver.ts
export const testQueries = defineQuery({
  testMyFeature: async () => {
    // Test your feature
    return { success: true }
  }
})
```

#### Type Safety

Ensure your feature is fully typed:

```typescript
// Add types to src/types/index.ts
export interface MyFeatureOptions {
  option1: string
  option2?: number
}

// Extend module configuration
export interface GraphQLOptions {
  // ... existing options
  myFeature?: MyFeatureOptions
}
```

### 4. Add Documentation

Every feature needs documentation:

#### Update Relevant Guides

Add documentation to `.docs/guide/`:

```markdown
# Your Feature Name

Brief description of what your feature does.

## Usage

\`\`\`typescript
// Code example
import graphql from 'nitro-graphql'
import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  modules: [
    graphql({
      framework: 'graphql-yoga',
      myFeature: {
        option1: 'value',
      },
    }),
  ],
})
\`\`\`

## Options

### `option1`
- Type: `string`
- Required: Yes
- Description: Description of option1

### `option2`
- Type: `number`
- Default: `10`
- Description: Description of option2

## Examples

### Example 1: Basic Usage
\`\`\`typescript
// Example code
\`\`\`

### Example 2: Advanced Usage
\`\`\`typescript
// Example code
\`\`\`

## Best Practices

- Best practice 1
- Best practice 2
```

#### Add to API Reference

If your feature adds new APIs, document them in `.docs/api/`:

```markdown
# Your API

## `yourFunction()`

Description of the function.

### Parameters

- `param1` - Type and description
- `param2` - Type and description

### Returns

Description of return value.

### Example

\`\`\`typescript
import { yourFunction } from 'nitro-graphql/utils'

yourFunction(param1, param2)
\`\`\`
```

#### Add Examples

Create practical examples in `.docs/examples/`:

```markdown
# Example: Using Your Feature

This example shows how to use [Your Feature] in a real-world scenario.

## Setup

\`\`\`bash
pnpm add nitro-graphql
\`\`\`

## Implementation

\`\`\`typescript
// Full working example
\`\`\`

## Explanation

Explain the key parts of the example.
```

### 5. Update CLAUDE.md

If your feature changes development workflows or architecture, update `/Users/code/Work/pb/nitro-graphql/CLAUDE.md`:

```markdown
## Your Feature Section

Description of your feature and how it fits into the architecture.

### Usage
\`\`\`typescript
// Example
\`\`\`

### Key Files
- `src/your-file.ts` - Description
```

## Pull Request Process

### 1. Prepare Your Changes

Before submitting:

```bash
# Run linter
pnpm lint:fix

# Build the project
pnpm build

# Test in playgrounds
pnpm playground:nitro
pnpm playground:nuxt
```

### 2. Commit Your Changes

Use [Conventional Commits](https://www.conventionalcommits.org/):

**Format:**
```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code style (formatting, semicolons, etc.)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding tests
- `chore:` - Maintenance tasks

**Examples:**
```bash
git commit -m "feat: add custom scalar support"
git commit -m "feat(codegen): add external service type generation"
git commit -m "fix: resolve Windows path issues in type generation"
git commit -m "docs: add Apollo Federation guide"
git commit -m "refactor(scanner): improve file discovery performance"
```

**Good commit messages:**
```
feat: add GraphQL shield integration

- Add shield directive support
- Update type generation for shield
- Add examples and documentation

Closes #123
```

**Bad commit messages:**
```
update stuff
fix bug
wip
changes
```

### 3. Push to Your Fork

```bash
git push origin feat/your-feature-name
```

### 4. Create Pull Request

#### PR Title

Use the same format as commit messages:

```
feat: add custom scalar support
fix: resolve type generation issues on Windows
docs: improve federation guide
```

#### PR Description

Fill out the template completely:

```markdown
## Description

Clear description of what this PR does and why.

## Related Issues

Closes #123
Relates to #456

## Changes

- Added X feature
- Fixed Y bug
- Updated Z documentation

## Testing

- [x] Tested in Nitro playground
- [x] Tested in Nuxt playground
- [x] Tested in Federation playground (if applicable)
- [x] Added/updated tests
- [x] Documentation updated

## Screenshots (if applicable)

Add screenshots for UI changes

## Breaking Changes

List any breaking changes and migration guide

## Checklist

- [x] Code follows project style guidelines
- [x] Self-review completed
- [x] Comments added for complex logic
- [x] Documentation updated
- [x] No new warnings generated
```

#### Review Process

1. **Automated Checks** - CI must pass
2. **Maintainer Review** - Wait for feedback
3. **Address Comments** - Make requested changes
4. **Approval** - Get approval from maintainers
5. **Merge** - Maintainer will merge your PR

### 5. Respond to Feedback

When you receive review comments:

```bash
# Make changes based on feedback
# ... edit files ...

# Commit changes
git add .
git commit -m "refactor: address review feedback"

# Push updates
git push origin feat/your-feature-name
```

## Feature Examples

### Example 1: Adding a New Utility Function

```typescript
// src/utils/my-utility.ts
import type { GraphQLSchema } from 'graphql'

/**
 * Utility to validate GraphQL schema
 */
export function validateSchema(schema: GraphQLSchema): boolean {
  // Implementation
  return true
}

// Export from main utils
// src/utils/index.ts
export { validateSchema } from './my-utility'
```

**Add to package.json exports:**
```json
{
  "exports": {
    "./utils": {
      "types": "./dist/utils/index.d.ts",
      "import": "./dist/utils/index.js"
    }
  }
}
```

### Example 2: Adding Configuration Option

```typescript
// src/types/index.ts
export interface GraphQLOptions {
  // ... existing options

  /**
   * Enable schema validation
   * @default true
   */
  validateSchema?: boolean
}

// src/index.ts
export default defineNitroModule({
  setup(nitro, options) {
    const validateSchema = options.validateSchema ?? true

    if (validateSchema) {
      // Implement validation
    }
  }
})
```

### Example 3: Adding a New Route Handler

```typescript
// src/routes/my-endpoint.ts
import { defineEventHandler } from 'nitro/h3'

export default defineEventHandler((event) => {
  return {
    message: 'My endpoint'
  }
})

// Register in src/index.ts
nitro.options.handlers.push({
  route: '/api/my-endpoint',
  handler: resolver.resolve('./routes/my-endpoint')
})
```

## Common Pitfalls

### Avoid These Mistakes

1. **Not testing in playgrounds**
   - Always test your changes in both Nitro and Nuxt playgrounds

2. **Breaking existing features**
   - Ensure backward compatibility
   - Add deprecation warnings for breaking changes

3. **Missing documentation**
   - Every feature needs docs
   - Add examples and use cases

4. **Poor type safety**
   - Add proper TypeScript types
   - Don't use `any` unless absolutely necessary

5. **Not following code style**
   - Run `pnpm lint:fix` before committing
   - Follow existing patterns

6. **Huge pull requests**
   - Keep PRs focused and small
   - Split large features into multiple PRs

7. **Not responding to reviews**
   - Address feedback promptly
   - Ask questions if something is unclear

## Feature Checklist

Before submitting your PR, ensure:

- [ ] Code is properly typed
- [ ] Tests added/updated (when applicable)
- [ ] Documentation written
- [ ] Examples added
- [ ] Tested in Nitro playground
- [ ] Tested in Nuxt playground
- [ ] Linter passes (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Commit messages follow conventions
- [ ] PR description is complete
- [ ] No breaking changes (or documented)
- [ ] CLAUDE.md updated (if needed)

## Getting Help

If you need help while developing:

- **Questions**: Ask in [GitHub Discussions](https://github.com/productdevbook/nitro-graphql/discussions)
- **Bugs**: Report in [GitHub Issues](https://github.com/productdevbook/nitro-graphql/issues)
- **Architecture**: Review [Architecture Guide](/contributing/architecture)
- **Setup Issues**: Check [Development Setup](/contributing/development-setup)

## Next Steps

- Review the [Architecture](/contributing/architecture) guide
- Learn about [Documentation](/contributing/documentation) standards
- Check out [existing PRs](https://github.com/productdevbook/nitro-graphql/pulls) for examples

---

## Source
<SourceLinks fn="addingFeatures"/>

## Contributors
<Contributors fn="addingFeatures"/>

## Changelog
<Changelog fn="addingFeatures"/>

---
category: Contributing
---

# Documentation

<FunctionInfo fn="documentation"/>

This guide covers how to contribute to Nitro GraphQL documentation, including writing guides, API references, and examples.

## Documentation Structure

The documentation is built with [VitePress](https://vitepress.dev/) and located in the `.docs/` directory:

```
.docs/
├── .vitepress/
│   ├── config.mts           # VitePress configuration
│   └── theme/               # Custom theme (if any)
├── guide/                   # User guides
│   ├── introduction.md
│   ├── installation.md
│   └── ...
├── api/                     # API reference
│   ├── configuration.md
│   ├── resolver-functions.md
│   └── ...
├── recipes/                 # How-to recipes
│   ├── crud-operations.md
│   ├── authentication.md
│   └── ...
├── examples/                # Complete examples
│   ├── nitro-basic.md
│   ├── nuxt-fullstack.md
│   └── ...
├── contributing/            # Contributing guides (this section)
│   ├── development-setup.md
│   ├── architecture.md
│   └── ...
├── troubleshooting/         # Problem-solving guides
│   ├── common-issues.md
│   └── ...
└── index.md                 # Homepage
```

## Running the Docs Locally

### Setup

```bash
cd .docs
pnpm install
```

### Development Server

Start the development server with hot reload:

```bash
cd .docs
pnpm dev
```

The docs will be available at `http://localhost:5173`.

### Build

Build the static site:

```bash
cd .docs
pnpm build
```

Preview the built site:

```bash
cd .docs
pnpm preview
```

## Writing Guidelines

### Style Guide

#### Tone and Voice

- **Clear and concise** - Get to the point quickly
- **Friendly but professional** - Be approachable
- **Active voice** - "The module generates types" not "Types are generated"
- **Present tense** - "The function returns" not "The function will return"
- **Second person** - "You can configure" not "Users can configure"

#### Formatting

**Headings:**
```markdown
# Page Title (H1 - only one per page)

## Main Section (H2)

### Subsection (H3)

#### Detail (H4 - use sparingly)
```

**Code Blocks:**
````markdown
```typescript
// Always specify the language
export const example = () => {
  return 'value'
}
```
````

**File Paths:**
```markdown
Use inline code for paths: `server/graphql/schema.graphql`
```

**Emphasis:**
```markdown
Use **bold** for important concepts.
Use *italic* for slight emphasis.
Use `inline code` for code, commands, and file names.
```

**Lists:**
```markdown
Use bullet lists for unordered items:
- Item 1
- Item 2
- Item 3

Use numbered lists for sequential steps:
1. First step
2. Second step
3. Third step
```

**Links:**
```markdown
[Link text](/guide/installation)           # Internal links (no .md)
[External link](https://example.com)       # External links
```

### Code Examples

#### Quality Code Examples

**Good:**
```typescript
// ✅ Complete, working example
import { defineQuery } from 'nitro-graphql/define'

export const userQueries = defineQuery({
  user: async (_, { id }, context) => {
    // Real implementation
    return await context.db.user.findUnique({
      where: { id }
    })
  }
})
```

**Bad:**
```typescript
// ❌ Incomplete, unclear example
export default defineQuery({
  user: () => {
    // ... implementation
  }
})
```

#### Example Structure

```markdown
## Feature Name

Brief description of what this does.

### Basic Example

\`\`\`typescript
// Simplest possible example
\`\`\`

### Real-World Example

\`\`\`typescript
// Complete, production-ready example
\`\`\`

### Explanation

Explain the key parts:
- What this line does
- Why we use this pattern
- Common gotchas
```

#### Code Groups

For showing multiple options:

````markdown
::: code-group

```typescript [GraphQL Yoga]
// GraphQL Yoga example
```

```typescript [Apollo Server]
// Apollo Server example
```

:::
````

### Writing Different Types of Documentation

#### Guide Pages

Guide pages teach concepts:

```markdown
# Guide Title

## What is X?

Define the concept clearly.

## Why use X?

Explain benefits and use cases.

## How to use X

### Setup

Step-by-step setup instructions.

### Basic Usage

\`\`\`typescript
// Simple example
\`\`\`

### Advanced Usage

\`\`\`typescript
// Advanced example
\`\`\`

## Best Practices

- Best practice 1
- Best practice 2

## Common Issues

### Issue 1

How to solve it.

## Next Steps

Link to related guides.
```

#### API Reference

API pages document functions and types:

```markdown
# API Name

## Overview

What this API provides.

## Functions

### `functionName(param1, param2)`

Brief description.

#### Parameters

- **`param1`** (`string`, required) - Description of param1
- **`param2`** (`number`, optional, default: `10`) - Description of param2

#### Returns

- **Type**: `Promise<ReturnType>`
- **Description**: What the function returns

#### Example

\`\`\`typescript
import { functionName } from 'nitro-graphql/utils'

const result = await functionName('value', 20)
\`\`\`

#### Throws

- `Error` - When something goes wrong

## Types

### `TypeName`

\`\`\`typescript
interface TypeName {
  property1: string
  property2?: number
}
\`\`\`

#### Properties

- **`property1`** (`string`, required) - Description
- **`property2`** (`number`, optional) - Description
```

#### Recipe Pages

Recipes are practical how-tos:

```markdown
# Recipe: Task Name

Learn how to accomplish a specific task.

## Prerequisites

What you need before starting:
- Prerequisite 1
- Prerequisite 2

## Overview

Brief explanation of what we'll build.

## Step 1: Setup

\`\`\`bash
# Commands
\`\`\`

## Step 2: Implementation

\`\`\`typescript
// Code
\`\`\`

Explanation of the code.

## Step 3: Testing

How to test the implementation.

## Complete Example

\`\`\`typescript
// Full working code
\`\`\`

## Explanation

Detailed explanation of key concepts.

## Best Practices

- Best practice 1
- Best practice 2

## Troubleshooting

Common issues and solutions.

## Related Recipes

- [Related recipe 1](/recipes/name)
- [Related recipe 2](/recipes/name)
```

#### Example Pages

Examples show complete implementations:

```markdown
# Example: Project Name

Complete working example of [concept].

## Overview

What this example demonstrates.

## Features

- Feature 1
- Feature 2
- Feature 3

## Project Structure

\`\`\`
project/
├── server/
│   └── graphql/
├── app/
└── nitro.config.ts
\`\`\`

## Setup

\`\`\`bash
# Clone and setup
git clone https://github.com/example/repo
cd repo
pnpm install
pnpm dev
\`\`\`

## Implementation

### Configuration

\`\`\`typescript
// nitro.config.ts
\`\`\`

### Schema

\`\`\`graphql
# schema.graphql
\`\`\`

### Resolvers

\`\`\`typescript
// resolvers.ts
\`\`\`

## Key Concepts

Explain important patterns used.

## Try It Out

1. Start the server
2. Open GraphQL playground
3. Run example queries

## Source Code

[View on GitHub](https://github.com/example/repo)
```

## VitePress Features

### Containers

VitePress supports custom containers:

```markdown
::: info
Informational content
:::

::: tip
Helpful tip
:::

::: warning
Warning about something
:::

::: danger
Critical warning
:::

::: details Click to expand
Hidden content that can be expanded
:::
```

### Custom Components

You can use Vue components in markdown:

```markdown
<Badge type="info" text="v2.0+" />
<Badge type="warning" text="deprecated" />
<Badge type="danger" text="breaking" />
```

### Code Line Highlighting

Highlight specific lines:

````markdown
```typescript {2,4-6}
function example() {
  const highlighted = true // This line is highlighted
  const normal = true
  const highlighted1 = true // These lines
  const highlighted2 = true // are also
  const highlighted3 = true // highlighted
}
```
````

### Code Diffs

Show code changes:

````markdown
```typescript
export default defineQuery({
  user: async (_, { id }) => {
    return db.user.find(id) // [!code --]
    return await db.user.findUnique({ where: { id } }) // [!code ++]
  }
})
```
````

## Navigation and Organization

### Adding New Pages

1. **Create the markdown file** in the appropriate directory

2. **Add to navigation** in `.docs/.vitepress/config.mts`:

```typescript
sidebar: {
  '/guide/': [
    {
      text: 'Your Section',
      collapsed: false,
      items: [
        { text: 'Your Page', link: '/guide/your-page' }
      ]
    }
  ]
}
```

3. **Link from other pages** where relevant:

```markdown
See the [Your Page](/guide/your-page) for more details.
```

### Page Metadata

Add frontmatter to customize pages:

```markdown
---
title: Custom Page Title
description: Page description for SEO
head:
  - - meta
    - name: keywords
      content: keyword1, keyword2
---

# Page Content
```

## Documentation Checklist

Before submitting documentation:

- [ ] Spell check completed
- [ ] Grammar check completed
- [ ] All code examples tested
- [ ] All links work (internal and external)
- [ ] Images/screenshots added (if applicable)
- [ ] Navigation updated
- [ ] Builds without errors (`pnpm build`)
- [ ] Previewed locally (`pnpm dev`)
- [ ] Follows style guide
- [ ] Related pages updated/linked

## Common Patterns

### Installation Instructions

```markdown
## Installation

::: code-group

```bash [pnpm]
pnpm add nitro-graphql
```

```bash [npm]
npm install nitro-graphql
```

```bash [yarn]
yarn add nitro-graphql
```

:::
```

### Configuration Examples

```markdown
## Configuration

::: code-group

```typescript [Nitro]
// nitro.config.ts
import graphql from 'nitro-graphql'
import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  modules: [
    graphql({
      framework: 'graphql-yoga',
    }),
  ],
})
```

```typescript [Nuxt]
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nitro-graphql/nuxt'],
  nitro: {
    graphql: {
      framework: 'graphql-yoga',
    },
  },
})
```

:::
```

### Versioning Notes

```markdown
::: info
This feature is available in v2.0+
:::

::: warning BREAKING CHANGE
This is a breaking change from v1.x
:::

::: tip New in v2.1
This feature was added in version 2.1
:::
```

### Related Links

```markdown
## Related

- [Related Guide 1](/guide/name)
- [Related Guide 2](/guide/name)
- [API Reference](/api/name)
```

## Updating Existing Documentation

### When to Update

Update documentation when:
- Adding a new feature
- Fixing a bug that affects documented behavior
- Deprecating functionality
- Improving clarity
- Fixing errors or typos

### How to Update

1. **Find the relevant file** in `.docs/`
2. **Make your changes**
3. **Test locally** with `pnpm dev`
4. **Build to verify** with `pnpm build`
5. **Submit PR** with description of changes

### Deprecation Notices

When deprecating features:

```markdown
::: warning DEPRECATED
This API is deprecated and will be removed in v3.0.
Use [new API](/api/new-api) instead.
:::

## Old API (Deprecated)

### Migration Guide

\`\`\`typescript
// Old way (deprecated)
const old = useOldApi()

// New way (recommended)
const new = useNewApi()
\`\`\`
```

## Documentation Best Practices

### Do's

- ✅ Test all code examples
- ✅ Use real-world scenarios
- ✅ Explain the "why" not just the "how"
- ✅ Include troubleshooting sections
- ✅ Link to related documentation
- ✅ Update when code changes
- ✅ Use TypeScript in examples
- ✅ Show both simple and advanced examples

### Don'ts

- ❌ Don't use incomplete examples
- ❌ Don't use `any` or untyped code
- ❌ Don't forget to explain complex concepts
- ❌ Don't link to external docs for core concepts
- ❌ Don't use jargon without explanation
- ❌ Don't skip error handling in examples
- ❌ Don't use default exports in resolver examples
- ❌ Don't forget to update related pages

## Getting Feedback

Before submitting large documentation changes:

1. Open an issue describing the changes
2. Get feedback from maintainers
3. Make the changes
4. Submit PR with clear description

## Resources

- [VitePress Documentation](https://vitepress.dev/)
- [Markdown Guide](https://www.markdownguide.org/)
- [Vue in Markdown](https://vitepress.dev/guide/using-vue)
- [GraphQL Style Guide](https://graphql.org/learn/best-practices/)

## Next Steps

- Review [Development Setup](/contributing/development-setup)
- Understand [Architecture](/contributing/architecture)
- Learn about [Adding Features](/contributing/adding-features)

---

## Source
<SourceLinks fn="documentation"/>

## Contributors
<Contributors fn="documentation"/>

## Changelog
<Changelog fn="documentation"/>

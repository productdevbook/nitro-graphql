---
category: Ecosystem
---

# Tooling

<FunctionInfo fn="tooling"/>

Enhance your GraphQL development experience with IDE extensions, debugging tools, and GraphQL Config integration.

## GraphQL Config

Nitro GraphQL automatically generates a `graphql.config.ts` file for IDE tooling integration.

### Auto-Generated Config

```ts
// graphql.config.ts (auto-generated)
import type { IGraphQLConfig } from 'graphql-config'

export default <IGraphQLConfig> {
  projects: {
    default: {
      schema: [
        './.nitro/graphql/schema.graphql', // or .nuxt for Nuxt
      ],
      documents: [
        './app/graphql/**/*.{graphql,js,ts,jsx,tsx}',
      ],
    },
  },
}
```

This file enables:
- IntelliSense in `.graphql` files
- Schema validation
- Auto-completion
- Go-to-definition
- Error highlighting

### Disabling Auto-Generation

If you prefer to manage your own config:

```ts
// nuxt.config.ts or nitro.config.ts
export default defineNuxtConfig({
  nitro: {
    graphql: {
      framework: 'graphql-yoga',
      scaffold: {
        graphqlConfig: false, // Disable auto-generation
      },
    },
  },
})
```

### Custom Configuration

```ts
// graphql.config.ts
import type { IGraphQLConfig } from 'graphql-config'

export default <IGraphQLConfig> {
  projects: {
    default: {
      schema: ['./.nuxt/graphql/schema.graphql'],
      documents: ['./app/graphql/**/*.graphql'],
      extensions: {
        // Custom codegen config
        codegen: {
          generates: {
            './types/graphql.ts': {
              plugins: ['typescript'],
            },
          },
        },
        // Custom endpoints
        endpoints: {
          default: {
            url: 'http://localhost:3000/api/graphql',
            headers: {
              Authorization: 'Bearer token',
            },
          },
        },
      },
    },
    // External services as separate projects
    github: {
      schema: ['./.nuxt/types/nitro-graphql-client-github.d.ts'],
      documents: ['./app/graphql/github/**/*.graphql'],
      extensions: {
        endpoints: {
          default: {
            url: 'https://api.github.com/graphql',
            headers: {
              Authorization: 'Bearer ${GITHUB_TOKEN}',
            },
          },
        },
      },
    },
  },
}
```

## VS Code Extensions

### GraphQL: Language Feature Support

**Extension**: [GraphQL.vscode-graphql](https://marketplace.visualstudio.com/items?itemName=GraphQL.vscode-graphql)

Features:
- Syntax highlighting
- Auto-completion
- Go to definition
- Schema validation
- Inline documentation
- Query execution

**Installation**:
```bash
code --install-extension GraphQL.vscode-graphql
```

**Settings** (`.vscode/settings.json`):
```json
{
  "graphql-config.load.rootDir": "./",
  "graphql-config.load.configName": "graphql.config",
  "graphql-config.dotEnvPath": ".env"
}
```

### GraphQL: Syntax Highlighting

**Extension**: [GraphQL.vscode-graphql-syntax](https://marketplace.visualstudio.com/items?itemName=GraphQL.vscode-graphql-syntax)

Provides syntax highlighting for GraphQL in:
- `.graphql` files
- `.gql` files
- JavaScript/TypeScript template literals

### Apollo GraphQL

**Extension**: [apollographql.vscode-apollo](https://marketplace.visualstudio.com/items?itemName=apollographql.vscode-apollo)

Features:
- Schema validation
- Auto-completion
- Performance insights
- Apollo Studio integration

**Installation**:
```bash
code --install-extension apollographql.vscode-apollo
```

### Recommended VS Code Settings

```json
// .vscode/settings.json
{
  // GraphQL
  "graphql-config.load.rootDir": "./",
  "graphql-config.load.configName": "graphql.config",
  "graphql-config.dotEnvPath": ".env",

  // File associations
  "[graphql]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "GraphQL.vscode-graphql"
  },

  // Exclude build directories
  "files.watcherExclude": {
    "**/.nuxt/**": true,
    "**/.nitro/**": true,
    "**/node_modules/**": true
  },

  // Auto-import suggestions
  "typescript.preferences.autoImportFileExcludePatterns": [
    "**/node_modules/@types/node",
    "**/.nuxt/types/nitro-graphql-*"
  ]
}
```

## WebStorm / IntelliJ IDEA

### GraphQL Plugin

**Plugin**: [GraphQL](https://plugins.jetbrains.com/plugin/8097-graphql)

Features:
- Schema-aware completion
- Syntax validation
- Type checking
- Refactoring support
- GraphQL endpoint testing

**Installation**:
1. Open Settings (Cmd+, or Ctrl+Alt+S)
2. Go to Plugins
3. Search for "GraphQL"
4. Click Install

### Configuration

WebStorm automatically detects `graphql.config.ts` and provides:
- Schema validation
- Auto-completion in `.graphql` files
- Inline documentation
- Navigation to type definitions

### Useful Shortcuts

- `Cmd/Ctrl + Space` - Auto-completion
- `Cmd/Ctrl + B` - Go to definition
- `Cmd/Ctrl + P` - Show parameter hints
- `Alt + Enter` - Quick fixes

## Debug Dashboard

Nitro GraphQL includes a comprehensive debug dashboard in development mode.

### Accessing the Dashboard

Start your dev server:
```bash
pnpm dev
```

Visit: **http://localhost:3000/_nitro/graphql/debug**

### Dashboard Features

#### 1. Overview Section
- Framework information (GraphQL Yoga or Apollo Server)
- Total schemas count
- Total resolvers count
- Total directives count
- Total client documents count

#### 2. Virtual File System (VFS)
View all loaded GraphQL files:
- **Schemas**: All server schema files
- **Resolvers**: All resolver files with exports
- **Directives**: Custom directive implementations
- **Client Documents**: Frontend query/mutation files

Click on any file to view its contents.

#### 3. Merged Schema
View the complete merged GraphQL schema, including:
- All types from all layers (if using Nuxt layers)
- Custom directives
- Federation directives (if enabled)
- Built-in scalars

#### 4. Configuration Inspector
View your current GraphQL configuration:
- Framework settings
- External services
- Path configurations
- File generation settings

#### 5. Type Generation Status
Check type generation status:
- Server types location
- Client types location
- External service types
- Last generation timestamp

### Debug Output

The dev server also outputs debug information:

```bash
┌─────────────────────────────────┐
│  Nitro GraphQL                  │
│  Framework: graphql-yoga        │
│  Schemas: 3                     │
│  Resolvers: 5                   │
│  Directives: 1                  │
│  Documents: 8                   │
│                                 │
│  Debug Dashboard:               │
│  /_nitro/graphql/debug          │
└─────────────────────────────────┘

[nitro-graphql] 5 resolver export(s): 3 query, 2 mutation
[nitro-graphql] Generated server types at: .nuxt/types/nitro-graphql-server.d.ts
[nitro-graphql] Generated client types at: .nuxt/types/nitro-graphql-client.d.ts
```

## GraphQL Playground

### Built-in Playground

GraphQL Yoga includes a built-in playground available at your GraphQL endpoint.

**Access**: http://localhost:3000/api/graphql

Features:
- Interactive query editor
- Schema explorer
- Documentation browser
- Query history
- Variable editor
- Response viewer

### Disabling Playground

In production or if you prefer to disable it:

```ts
// server/graphql/config.ts
export default defineGraphQLConfig({
  yoga: {
    graphiql: false, // Disable GraphiQL
  },
})
```

Or via runtime config:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    runtimeConfig: {
      graphql: {
        playground: false, // Disable in production
      },
    },
  },
})
```

### Apollo Server Sandbox

If using Apollo Server, access Apollo Sandbox:

**Access**: http://localhost:3000/api/graphql

Features:
- Interactive query editor
- Schema documentation
- Operation collections
- Mock responses
- Apollo Studio integration

## Browser DevTools

### GraphQL Devtools

**Extension**: [GraphQL Network Inspector](https://chrome.google.com/webstore/detail/graphql-network-inspector/ndlbedplllcgconngcnfmkadhokfaaln)

Features:
- Inspect GraphQL requests
- View query/mutation details
- Monitor performance
- Debug responses
- Query history

**Installation**: Install from Chrome Web Store or Firefox Add-ons

### Vue Devtools

Use Vue Devtools to inspect:
- Component state
- GraphQL query results in `useAsyncData`
- Computed values from GraphQL data
- Composable state

## Command Line Tools

### GraphQL Code Generator

For advanced code generation:

```bash
pnpm add -D @graphql-codegen/cli
```

```yaml
# codegen.yml
schema: .nuxt/graphql/schema.graphql
documents: app/graphql/**/*.graphql
generates:
  ./types/graphql.ts:
    plugins:
      - typescript
      - typescript-operations
      - typescript-vue-apollo
```

Run:
```bash
pnpm graphql-codegen
```

### GraphQL Inspector

Compare schemas, validate changes:

```bash
pnpm add -D @graphql-inspector/cli
```

Compare schemas:
```bash
graphql-inspector diff old-schema.graphql new-schema.graphql
```

Validate documents:
```bash
graphql-inspector validate "app/graphql/**/*.graphql" schema.graphql
```

### GraphQL ESLint

Lint your GraphQL files:

```bash
pnpm add -D @graphql-eslint/eslint-plugin
```

```js
// .eslintrc.js
module.exports = {
  overrides: [
    {
      files: ['*.graphql'],
      parser: '@graphql-eslint/eslint-plugin',
      plugins: ['@graphql-eslint'],
      rules: {
        '@graphql-eslint/known-type-names': 'error',
        '@graphql-eslint/no-anonymous-operations': 'error',
        '@graphql-eslint/naming-convention': [
          'error',
          {
            OperationDefinition: {
              style: 'PascalCase',
              forbiddenPrefixes: ['Query', 'Mutation', 'Subscription'],
              forbiddenSuffixes: ['Query', 'Mutation', 'Subscription'],
            },
          },
        ],
      },
    },
  ],
}
```

## Testing Tools

### GraphQL Request Testing

```ts
import { $fetch } from '@nuxt/test-utils'
// test/api/graphql.test.ts
import { describe, expect, it } from 'vitest'

describe('GraphQL API', () => {
  it('fetches users', async () => {
    const response = await $fetch('/api/graphql', {
      method: 'POST',
      body: {
        query: `
          query {
            users {
              id
              name
            }
          }
        `,
      },
    })

    expect(response.data.users).toBeDefined()
    expect(Array.isArray(response.data.users)).toBe(true)
  })
})
```

### Mock Server

Create a mock GraphQL server for testing:

```ts
// test/mocks/graphql-server.ts
import { buildSchema, graphql } from 'graphql'

const schema = buildSchema(`
  type User {
    id: ID!
    name: String!
  }

  type Query {
    users: [User!]!
  }
`)

const root = {
  users: () => [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
  ],
}

export async function executeQuery(query: string) {
  return await graphql({ schema, source: query, rootValue: root })
}
```

## Performance Monitoring

### Query Complexity Analysis

Monitor query complexity:

```ts
// server/graphql/config.ts
import { createComplexityRule } from 'graphql-validation-complexity'

export default defineGraphQLConfig({
  yoga: {
    maskedErrors: false,
    plugins: [
      createComplexityRule({
        maximumComplexity: 1000,
        onCost: (cost) => {
          console.log('Query cost:', cost)
        },
      }),
    ],
  },
})
```

### Response Time Tracking

Add timing to resolvers:

```ts
// server/graphql/users.resolver.ts
export const userQueries = defineQuery({
  users: async (_, __, context) => {
    const start = Date.now()

    const users = await fetchUsers()

    const duration = Date.now() - start
    console.log(`Fetched users in ${duration}ms`)

    return users
  },
})
```

### Apollo Studio Integration

For Apollo Server, connect to Apollo Studio:

```ts
// server/graphql/config.ts
export default defineGraphQLConfig({
  apollo: {
    introspection: true,
    plugins: [
      ApolloServerPluginUsageReporting({
        sendVariableValues: { all: true },
      }),
    ],
  },
})
```

## CI/CD Integration

### Schema Validation

Add to your CI pipeline:

```yaml
# .github/workflows/graphql.yml
name: GraphQL Validation

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: pnpm install

      - name: Validate GraphQL schemas
        run: |
          pnpm graphql-inspector validate \
            "server/graphql/**/*.graphql" \
            --deprecated

      - name: Check for breaking changes
        run: |
          pnpm graphql-inspector diff \
            origin/main:schema.graphql \
            HEAD:schema.graphql
```

### Type Generation Check

Ensure types are up-to-date:

```yaml
- name: Generate types
  run: pnpm dev & sleep 5 && kill $!

- name: Check for changes
  run: |
    if [[ -n $(git status --porcelain .nuxt/types/) ]]; then
      echo "Generated types have changes. Please commit them."
      exit 1
    fi
```

## Troubleshooting

### Schema Not Loading in IDE

**Problem**: IDE doesn't recognize GraphQL types

**Solution**:
1. Ensure `graphql.config.ts` exists
2. Restart IDE/reload window
3. Check that schema path is correct
4. Verify GraphQL extension is installed

### Auto-completion Not Working

**Problem**: No auto-completion in `.graphql` files

**Solution**:
1. Install GraphQL extension
2. Generate types: `pnpm dev` (run once)
3. Check GraphQL Config is valid
4. Restart TypeScript server: `Cmd+Shift+P` → "TypeScript: Restart TS Server"

### Debug Dashboard Not Available

**Problem**: `/_nitro/graphql/debug` returns 404

**Solution**:
- Debug dashboard only available in development mode
- Start dev server: `pnpm dev`
- Check that `nitro.options.dev` is true

### Types Not Updating

**Problem**: Generated types are stale

**Solution**:
1. Restart dev server
2. Check console for generation errors
3. Verify file naming (must be `.graphql`)
4. Check `.nuxt/types/` or `.nitro/types/` directory

## Best Practices

### 1. Use GraphQL Config

Always maintain `graphql.config.ts` for IDE support.

### 2. Install IDE Extensions

Install language support extensions for your IDE.

### 3. Use Debug Dashboard

Regularly check the debug dashboard during development.

### 4. Monitor Query Complexity

Add complexity limits to prevent expensive queries.

### 5. Validate in CI/CD

Add GraphQL validation to your CI/CD pipeline.

### 6. Version Control

Don't commit generated files (add to `.gitignore`):
```gitignore
.nuxt/
.nitro/
.output/
```

## Next Steps

- [Debug Dashboard](/guide/debug-dashboard) - Comprehensive debugging guide
- [Testing](/guide/testing) - Testing strategies
- [Performance](/guide/performance) - Performance optimization
- [Error Handling](/guide/error-handling) - Error handling patterns

---

## Source
<SourceLinks fn="tooling"/>

## Contributors
<Contributors fn="tooling"/>

## Changelog
<Changelog fn="tooling"/>

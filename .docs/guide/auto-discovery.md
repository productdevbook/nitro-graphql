# Auto-Discovery

Learn how Nitro GraphQL automatically discovers and loads your GraphQL schemas, resolvers, and directives.

## How Auto-Discovery Works

Nitro GraphQL scans your project at build time and during development to find:

- **Schema files**: `*.graphql`
- **Resolver files**: `*.resolver.ts`
- **Directive files**: `*.directive.ts`
- **Client queries**: `*.graphql` in client directories

All discovered files are automatically loaded and merged into your GraphQL server.

## File Naming Conventions

### Schema Files

**Pattern**: `*.graphql`

**Location**: `server/graphql/**/*.graphql`

Examples:
```
✅ server/graphql/schema.graphql
✅ server/graphql/user.graphql
✅ server/graphql/users/user.graphql
✅ server/graphql/posts/post.graphql
❌ server/graphql/schema.gql (wrong extension)
❌ server/api/schema.graphql (wrong directory)
```

### Resolver Files

**Pattern**: `*.resolver.ts`

**Location**: `server/graphql/**/*.resolver.ts`

Examples:
```
✅ server/graphql/hello.resolver.ts
✅ server/graphql/users/user.resolver.ts
✅ server/graphql/users/queries.resolver.ts
✅ server/graphql/users/mutations.resolver.ts
❌ server/graphql/user-resolver.ts (wrong pattern)
❌ server/graphql/user.ts (missing .resolver)
```

::: warning Named Exports Required
Resolver files MUST use named exports:

```ts
// ✅ Correct
export const userQueries = defineQuery({...})

// ❌ Wrong - won't be discovered
export default defineQuery({...})
```
:::

### Directive Files

**Pattern**: `*.directive.ts`

**Location**: `server/graphql/**/*.directive.ts`

Examples:
```
✅ server/graphql/directives/auth.directive.ts
✅ server/graphql/directives/cache.directive.ts
✅ server/graphql/auth.directive.ts
```

### Client Query Files (Nuxt)

**Pattern**: `*.graphql`

**Location**: `app/graphql/**/*.graphql` (Nuxt) or `graphql/**/*.graphql` (Nitro)

Examples:
```
✅ app/graphql/queries.graphql
✅ app/graphql/users/get-users.graphql
✅ app/graphql/users/create-user.graphql
```

## Directory Structure

### Recommended Structure

```
server/
└── graphql/
    ├── schema.graphql              # Root schema
    ├── users/
    │   ├── user.graphql           # User types
    │   ├── queries.resolver.ts    # User queries
    │   ├── mutations.resolver.ts  # User mutations
    │   └── types.resolver.ts      # User field resolvers
    ├── posts/
    │   ├── post.graphql
    │   └── post.resolver.ts
    └── directives/
        ├── auth.directive.ts
        └── cache.directive.ts
```

### Minimal Structure

```
server/
└── graphql/
    ├── schema.graphql
    └── hello.resolver.ts
```

### Large Project Structure

```
server/
└── graphql/
    ├── schema.graphql
    ├── auth/
    │   ├── user.graphql
    │   ├── user.resolver.ts
    │   ├── session.graphql
    │   └── session.resolver.ts
    ├── content/
    │   ├── post.graphql
    │   ├── post.resolver.ts
    │   ├── comment.graphql
    │   └── comment.resolver.ts
    └── directives/
        ├── auth.directive.ts
        ├── permission.directive.ts
        └── cache.directive.ts
```

## Scanning Behavior

### Build Time

During `pnpm build`:

1. Scans `server/graphql/` for `.graphql` files
2. Merges all schemas into a unified schema
3. Scans `server/graphql/` for `.resolver.ts` files
4. Parses resolvers using `oxc-parser`
5. Generates virtual imports for schemas and resolvers
6. Generates TypeScript type definitions

### Development Mode

During `pnpm dev`:

1. Initial scan on startup (same as build)
2. Watches for file changes
3. Hot-reloads on schema/resolver changes
4. Regenerates types automatically

::: tip File Watching
The dev server watches for changes in:
- `server/graphql/**/*.graphql`
- `server/graphql/**/*.resolver.ts`
- `server/graphql/**/*.directive.ts`

Changes trigger automatic reload and type regeneration.
:::

## Nuxt Layers Support

Nitro GraphQL supports Nuxt layers with automatic multi-layer scanning.

### Example

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['./layers/base', './layers/auth'],
  modules: ['nitro-graphql/nuxt'],
})
```

### Layer Structure

```
project/
├── layers/
│   ├── base/
│   │   └── server/
│   │       └── graphql/
│   │           ├── schema.graphql      # ← Discovered
│   │           └── posts.resolver.ts   # ← Discovered
│   └── auth/
│       └── server/
│           └── graphql/
│               ├── user.graphql        # ← Discovered
│               └── user.resolver.ts    # ← Discovered
└── server/
    └── graphql/
        ├── schema.graphql              # ← Discovered
        └── app.resolver.ts             # ← Discovered
```

All schemas and resolvers from all layers are automatically discovered and merged!

### Layer Priority

When extending multiple layers:

1. Base layers are loaded first
2. Extended layers override base layers
3. App-level files override all layers

```ts
// Base layer
export const userQueries = defineQuery({
  users: () => [{ id: '1', name: 'Base User' }],
})

// App layer (overrides base)
export const userQueries = defineQuery({
  users: () => [{ id: '1', name: 'App User' }], // ← This wins
})
```

## Virtual Imports

Discovered files are exposed via virtual imports (for internal use):

```ts
import directives from '#nitro-internal-virtual/server-directives'
import resolvers from '#nitro-internal-virtual/server-resolvers'
// Virtual import - DO NOT use directly
import schemas from '#nitro-internal-virtual/server-schemas'
```

These are used internally by the GraphQL server setup.

## Resolver Scanning

Resolver files are parsed using `oxc-parser` to extract exports.

### What Gets Scanned

The scanner looks for named exports using these functions:

- `defineResolver`
- `defineQuery`
- `defineMutation`
- `defineType`
- `defineSubscription`
- `defineDirective`

### Example

```ts
// server/graphql/users.resolver.ts
export const userQueries = defineQuery({
  users: () => [], // ← Discovered
})

export const userMutations = defineMutation({
  createUser: () => ({}), // ← Discovered
})

// This won't be discovered (not using a define function)
export function someHelper() {}
```

Generated virtual import:

```ts
// Virtual: #nitro-internal-virtual/server-resolvers
import { userMutations, userQueries } from './server/graphql/users.resolver.ts'

export default [
  userQueries,
  userMutations,
]
```

## Custom Paths

You can customize discovery paths:

```ts
// nitro.config.ts
export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga',
    paths: {
      serverGraphql: 'src/server/graphql', // Custom server path
      clientGraphql: 'src/client/graphql', // Custom client path
    },
  },
})
```

::: tip Learn More
See the [Path Customization Guide](/guide/path-customization) for advanced configuration.
:::

## Debugging Discovery

### Check Generated Files

Look at auto-generated files to see what was discovered:

```
.nitro/
└── graphql/
    ├── schema.ts          # All discovered schemas
    └── resolvers.ts       # All discovered resolvers
```

### Enable Debug Logging

```ts
// nitro.config.ts
export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga',
  },
  devtools: { enabled: true },
})
```

Check console output during build:

```
✔ Discovered 3 schema files
✔ Discovered 5 resolver files
✔ Discovered 2 directive files
```

### Common Issues

**File not discovered**:
- Check file extension (`.graphql`, `.resolver.ts`, `.directive.ts`)
- Verify file location (`server/graphql/**/*`)
- Ensure named exports in resolvers
- Restart dev server

**Resolver not loaded**:
- Must use `define*` functions (`defineQuery`, etc.)
- Must be named export (not default)
- Check for syntax errors

**Schema not merged**:
- Check for GraphQL syntax errors
- Verify file has `.graphql` extension
- Ensure proper `extend type` usage

## Performance Considerations

### Build Performance

Auto-discovery is fast:
- **Small project** (10 files): ~50ms
- **Medium project** (100 files): ~200ms
- **Large project** (500 files): ~500ms

### Development Performance

File watching is efficient:
- Only watches `server/graphql/` directory
- Debounced reload (300ms)
- Incremental type generation

### Optimization Tips

1. **Organize files logically** - Grouped files are easier to scan
2. **Avoid deep nesting** - Keep directory depth reasonable
3. **Use consistent naming** - Helps with caching

## Next Steps

<div class="next-steps-grid">
<div class="next-step-card">
<h3>📁 File Organization</h3>
<p>Best practices for organizing files</p>
<a href="/guide/file-organization">File Organization →</a>
</div>

<div class="next-step-card">
<h3>🎯 Type Generation</h3>
<p>How types are generated from discovered files</p>
<a href="/guide/type-generation">Type Generation →</a>
</div>

<div class="next-step-card">
<h3>🔧 Path Customization</h3>
<p>Customize discovery paths</p>
<a href="/guide/path-customization">Path Customization →</a>
</div>

<div class="next-step-card">
<h3>📝 Schemas</h3>
<p>Learn about GraphQL schemas</p>
<a href="/guide/schemas">Schemas Guide →</a>
</div>
</div>

<style scoped>
.next-steps-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin: 24px 0;
}

.next-step-card {
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background-color: var(--vp-c-bg-soft);
  transition: all 0.3s;
}

.next-step-card:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(225, 0, 152, 0.1);
}

.next-step-card h3 {
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 16px;
}

.next-step-card p {
  margin-bottom: 12px;
  color: var(--vp-c-text-2);
  font-size: 14px;
}

.next-step-card a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
}

@media (max-width: 768px) {
  .next-steps-grid {
    grid-template-columns: 1fr;
  }
}
</style>

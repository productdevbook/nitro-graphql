# Hooks API Reference

Complete reference for Nitro hooks provided and used by Nitro GraphQL.

---

## Overview

Nitro GraphQL integrates with Nitro's hook system to provide extension points during the build process and runtime lifecycle. While the module doesn't expose custom GraphQL-specific hooks, it heavily uses Nitro's standard hooks.

---

## Nitro Hooks Used by GraphQL Module

### Build Hooks

#### `rollup:before`

Called before Rollup bundling starts. Nitro GraphQL uses this to configure bundle behavior for GraphQL files.

**Usage in Nitro GraphQL:**

```typescript
// Internal usage
nitro.hooks.hook('rollup:before', (_, rollupConfig) => {
  // Configure external dependencies
  rollupConfig.external = rollupConfig.external || []
  rollupConfig.external.push('oxc-parser', '@oxc-parser')

  // Configure chunk handling for GraphQL files
  rollupConfig.output.manualChunks = (id, meta) => {
    if (id.endsWith('.graphql') || id.endsWith('.gql')) {
      return 'schemas'
    }
    if (id.endsWith('.resolver.ts')) {
      return 'resolvers'
    }
  }
})
```

**Custom Hook Usage:**

```typescript
// nitro.config.ts
export default defineNitroConfig({
  graphql: { /* ... */ },
  hooks: {
    'rollup:before': (nitro, config) => {
      // Add custom rollup configuration
      console.log('Rollup config:', config)
    }
  }
})
```

---

#### `types:extend`

Called during TypeScript types generation. Nitro GraphQL uses this to add path mappings for virtual imports.

**Usage in Nitro GraphQL:**

```typescript
// Internal usage
nitro.hooks.hook('types:extend', (types) => {
  // Add path mappings
  types.tsConfig.compilerOptions.paths['#graphql/server'] = [
    '.nitro/types/nitro-graphql-server.d.ts'
  ]
  types.tsConfig.compilerOptions.paths['#graphql/client'] = [
    '.nitro/types/nitro-graphql-client.d.ts'
  ]

  // Add external service paths
  for (const service of externalServices) {
    types.tsConfig.compilerOptions.paths[`#graphql/client/${service.name}`] = [
      `.nitro/types/nitro-graphql-client-${service.name}.d.ts`
    ]
  }

  // Include generated types
  types.tsConfig.include.push(
    '.nitro/types/nitro-graphql-server.d.ts',
    '.nitro/types/nitro-graphql-client.d.ts'
  )
})
```

**Custom Hook Usage:**

```typescript
// nitro.config.ts
export default defineNitroConfig({
  graphql: { /* ... */ },
  hooks: {
    'types:extend': (types) => {
      // Add custom type paths
      types.tsConfig.compilerOptions.paths['@/types/*'] = [
        './types/*'
      ]
    }
  }
})
```

---

#### `build:before`

Called before the build starts. Used to prepare external services for Nuxt.

**Usage in Nitro GraphQL:**

```typescript
// Internal usage
nitro.hooks.hook('build:before', () => {
  // Pass external services to Nuxt module
  if (nitro.options.framework?.name === 'nuxt') {
    const nuxtOptions = nitro._nuxt?.options
    if (nuxtOptions) {
      nuxtOptions.nitroGraphqlExternalServices =
        nitro.options.graphql?.externalServices || []
    }
  }
})
```

**Custom Hook Usage:**

```typescript
// nitro.config.ts
export default defineNitroConfig({
  graphql: { /* ... */ },
  hooks: {
    'build:before': () => {
      console.log('Build starting...')
      // Prepare resources, validate config, etc.
    }
  }
})
```

---

### Development Hooks

#### `dev:start`

Called when development server starts. Nitro GraphQL uses this to scan files and show diagnostics.

**Usage in Nitro GraphQL:**

```typescript
// Internal usage
nitro.hooks.hook('dev:start', async () => {
  // Scan GraphQL files
  const schemas = await scanSchemas(nitro)
  const resolvers = await scanResolvers(nitro)
  const directives = await scanDirectives(nitro)
  const docs = await scanDocs(nitro)

  // Show diagnostic box
  consola.box({
    title: 'Nitro GraphQL',
    message: [
      `Framework: ${nitro.options.graphql?.framework}`,
      `Schemas: ${schemas.length}`,
      `Resolvers: ${resolvers.length}`,
      `Directives: ${directives.length}`,
      `Documents: ${docs.length}`,
      '',
      'Debug Dashboard: /_nitro/graphql/debug'
    ].join('\n')
  })
})
```

**Custom Hook Usage:**

```typescript
// nitro.config.ts
export default defineNitroConfig({
  graphql: { /* ... */ },
  hooks: {
    'dev:start': async () => {
      console.log('Dev server started!')
      // Initialize dev-only features
    }
  }
})
```

---

#### `dev:reload`

Called when development server reloads. Can be used to refresh GraphQL schemas.

**Custom Hook Usage:**

```typescript
// nitro.config.ts
export default defineNitroConfig({
  graphql: { /* ... */ },
  hooks: {
    'dev:reload': async () => {
      console.log('Reloading GraphQL schemas...')
      // Refresh cached data, reload external schemas, etc.
    }
  }
})
```

---

### Runtime Hooks

#### `close`

Called when Nitro is closing. Nitro GraphQL uses this for cleanup and final type generation.

**Usage in Nitro GraphQL:**

```typescript
// Internal usage
nitro.hooks.hook('close', async () => {
  // Final type generation
  await serverTypeGeneration(nitro)
  await clientTypeGeneration(nitro)

  // Close file watcher
  watcher.close()
})
```

**Custom Hook Usage:**

```typescript
// nitro.config.ts
export default defineNitroConfig({
  graphql: { /* ... */ },
  hooks: {
    close: async () => {
      console.log('Shutting down...')
      // Cleanup resources, close connections, etc.
    }
  }
})
```

---

## Custom Hooks in Application Code

While Nitro GraphQL doesn't provide custom hooks, you can use Nitro hooks in your application:

### Server Middleware Hook

```typescript
// server/middleware/graphql.ts
export default defineEventHandler((event) => {
  // Runs before GraphQL handler
  console.log('GraphQL request:', event.path)
})
```

### Request Lifecycle

```typescript
// server/plugins/graphql-logging.ts
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    if (event.path.includes('/graphql')) {
      console.log('GraphQL Request:', {
        path: event.path,
        method: event.method,
        headers: event.headers
      })
    }
  })

  nitroApp.hooks.hook('afterResponse', (event) => {
    if (event.path.includes('/graphql')) {
      console.log('GraphQL Response sent')
    }
  })
})
```

---

## Hook Patterns

### 1. Pre-Process Hook Pattern

Execute logic before main operation:

```typescript
export default defineNitroConfig({
  hooks: {
    'rollup:before': async (nitro, config) => {
      // Validate GraphQL files before bundling
      const schemas = await scanSchemas(nitro)
      for (const schema of schemas) {
        validateSchema(schema)
      }
    }
  }
})
```

### 2. Post-Process Hook Pattern

Execute logic after main operation:

```typescript
export default defineNitroConfig({
  hooks: {
    'types:extend': (types) => {
      // Post-process generated types
      console.log('Generated paths:', types.tsConfig.compilerOptions.paths)
    }
  }
})
```

### 3. Watch and Reload Pattern

React to file changes:

```typescript
import { watch } from 'chokidar'

export default defineNitroConfig({
  hooks: {
    'dev:start': () => {
      const watcher = watch('server/graphql/**/*.graphql')

      watcher.on('change', async (path) => {
        console.log('Schema changed:', path)
        // Trigger type regeneration
      })
    }
  }
})
```

### 4. Conditional Hook Pattern

Execute based on conditions:

```typescript
export default defineNitroConfig({
  hooks: {
    'build:before': () => {
      if (process.env.NODE_ENV === 'production') {
        // Production-only logic
        console.log('Building for production')
      }
    }
  }
})
```

---

## Nuxt-Specific Hooks

When using Nitro GraphQL with Nuxt, additional hooks are available:

### `prepare:types`

Used by Nuxt module to extend Nuxt types:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  hooks: {
    'prepare:types': (options) => {
      // Add custom type augmentations
      options.references.push({
        path: 'types/custom.d.ts'
      })
    }
  }
})
```

### `components:dirs`

Register auto-imported components:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  hooks: {
    'components:dirs': (dirs) => {
      // Add GraphQL component directory
      dirs.push({
        path: '~/components/graphql',
        global: true
      })
    }
  }
})
```

---

## Advanced Hook Examples

### Schema Validation Hook

```typescript
// nitro.config.ts
import { buildSchema } from 'graphql'

export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga'
  },
  hooks: {
    'dev:start': async () => {
      // Validate all GraphQL schemas
      const schemaFiles = await glob('server/graphql/**/*.graphql')

      for (const file of schemaFiles) {
        try {
          const content = await readFile(file, 'utf-8')
          buildSchema(content)
          console.log(`✓ ${file}`)
        } catch (error) {
          console.error(`✗ ${file}:`, error.message)
        }
      }
    }
  }
})
```

### Performance Monitoring Hook

```typescript
// server/plugins/graphql-metrics.ts
export default defineNitroPlugin((nitroApp) => {
  const metrics = new Map<string, number[]>()

  nitroApp.hooks.hook('request', (event) => {
    if (event.path.includes('/graphql')) {
      event.context._graphqlStart = Date.now()
    }
  })

  nitroApp.hooks.hook('afterResponse', (event) => {
    if (event.context._graphqlStart) {
      const duration = Date.now() - event.context._graphqlStart

      const operation = event.context._graphqlOperation || 'unknown'
      if (!metrics.has(operation)) {
        metrics.set(operation, [])
      }
      metrics.get(operation)!.push(duration)

      console.log(`GraphQL ${operation}: ${duration}ms`)
    }
  })

  // Expose metrics endpoint
  nitroApp.hooks.hook('close', () => {
    console.log('GraphQL Metrics:')
    for (const [operation, durations] of metrics) {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length
      console.log(`  ${operation}: ${avg.toFixed(2)}ms avg`)
    }
  })
})
```

### Custom Type Generation Hook

```typescript
// nitro.config.ts
import { writeFile } from 'fs/promises'

export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga'
  },
  hooks: {
    'types:extend': async (types) => {
      // Generate custom helper types
      const helpers = `
        // Auto-generated helper types
        import type { Resolvers } from '#graphql/server'

        export type QueryKeys = keyof NonNullable<Resolvers['Query']>
        export type MutationKeys = keyof NonNullable<Resolvers['Mutation']>
      `

      await writeFile('.nitro/types/graphql-helpers.d.ts', helpers)

      types.tsConfig.include.push(
        '.nitro/types/graphql-helpers.d.ts'
      )
    }
  }
})
```

### Error Tracking Hook

```typescript
// server/plugins/graphql-errors.ts
import * as Sentry from '@sentry/node'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error, { event }) => {
    if (event.path.includes('/graphql')) {
      Sentry.captureException(error, {
        tags: {
          type: 'graphql',
          operation: event.context._graphqlOperation
        },
        extra: {
          query: event.context._graphqlQuery,
          variables: event.context._graphqlVariables
        }
      })
    }
  })
})
```

---

## Best Practices

### 1. Use Async Hooks When Needed

```typescript
// ✅ Correct - async operation
hooks: {
  'dev:start': async () => {
    await validateSchemas()
  }
}

// ❌ Wrong - missing await
hooks: {
  'dev:start': () => {
    validateSchemas()  // Fire and forget
  }
}
```

### 2. Handle Hook Errors

```typescript
hooks: {
  'build:before': async () => {
    try {
      await prepareResources()
    } catch (error) {
      console.error('Failed to prepare resources:', error)
      // Decide: throw to stop build, or continue
    }
  }
}
```

### 3. Clean Up Resources

```typescript
let watcher: FSWatcher

hooks: {
  'dev:start': () => {
    watcher = watch('**/*.graphql')
  },
  close: () => {
    watcher?.close()
  }
}
```

### 4. Conditional Hook Execution

```typescript
hooks: {
  'dev:start': () => {
    if (process.env.DEBUG_GRAPHQL) {
      // Debug-only logic
      enableGraphQLDebugger()
    }
  }
}
```

### 5. Document Custom Hooks

```typescript
/**
 * Hook: dev:start
 * Purpose: Validate GraphQL schemas on dev server start
 * Why: Catch schema errors early in development
 */
hooks: {
  'dev:start': async () => {
    await validateAllSchemas()
  }
}
```

---

## Troubleshooting

### Hook Not Called

**Problem**: Custom hook doesn't execute

**Solutions**:
1. Verify hook name is correct (check Nitro docs)
2. Ensure hook is in correct config location
3. Check for errors in hook function
4. Try logging to confirm hook runs: `console.log('Hook called')`

### Async Hook Issues

**Problem**: Async operations not completing

**Solutions**:
1. Use `async/await` syntax
2. Ensure promises are awaited
3. Add error handling with try/catch
4. Check Nitro logs for hook errors

### Hook Order

**Problem**: Hooks executing in wrong order

**Solutions**:
1. Review Nitro hook lifecycle
2. Use appropriate hook for your needs
3. Consider dependencies between hooks
4. Use sequential hooks if order matters

### Type Issues in Hooks

**Problem**: TypeScript errors in hook functions

**Solutions**:
1. Import correct types from Nitro
2. Use type assertions if needed
3. Check Nitro version for breaking changes
4. Consult Nitro TypeScript documentation

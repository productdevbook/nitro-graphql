# File Generation Control

Complete control over which files are auto-generated and their output paths (v2.0+).

## Overview

Nitro GraphQL auto-generates several files. You can:
- Disable specific files
- Customize output paths
- Use path placeholders
- Configure per-service paths

## Configuration Structure

```ts
graphql: {
  framework: 'graphql-yoga',

  // Scaffold files
  scaffold: false | {
    enabled?: boolean
    graphqlConfig?: boolean | string
    serverSchema?: boolean | string
    serverConfig?: boolean | string
    serverContext?: boolean | string
  },

  // Client utilities (Nuxt only)
  clientUtils: false | {
    enabled?: boolean
    index?: boolean | string
    ofetch?: boolean | string
  },

  // SDK files
  sdk: false | {
    enabled?: boolean
    main?: boolean | string
    external?: boolean | string
  },

  // Type files
  types: false | {
    enabled?: boolean
    server?: boolean | string
    client?: boolean | string
    external?: boolean | string
  },

  // Global path overrides
  paths: {
    serverGraphql?: string
    clientGraphql?: string
    buildDir?: string
    typesDir?: string
  }
}
```

## Examples

### Library Mode (No Scaffolding)

```ts
graphql: {
  scaffold: false,
  clientUtils: false,
}
```

### Custom Monorepo Paths

```ts
graphql: {
  paths: {
    serverGraphql: 'packages/api/src/graphql',
    clientGraphql: 'packages/web/src/graphql',
    typesDir: 'packages/types/src/generated',
  },
}
```

### Selective File Generation

```ts
graphql: {
  scaffold: {
    graphqlConfig: false,              // Don't generate
    serverSchema: 'lib/schema.ts',     // Custom path
    serverConfig: true,                // Default location
    serverContext: false,              // Don't generate
  },
}
```

## Path Placeholders

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{serviceName}` | External service name | `github`, `stripe` |
| `{buildDir}` | Build directory | `.nitro` or `.nuxt` |
| `{rootDir}` | Root directory | `/Users/you/project` |
| `{framework}` | Framework name | `nuxt` or `nitro` |
| `{typesDir}` | Types directory | `.nitro/types` |
| `{serverGraphql}` | Server GraphQL dir | `server/graphql` |
| `{clientGraphql}` | Client GraphQL dir | `app/graphql` |

Example:

```ts
sdk: {
  external: '{clientGraphql}/{serviceName}/sdk.ts'
}
// → app/graphql/github/sdk.ts
// → app/graphql/stripe/sdk.ts
```

## Service-Specific Paths

```ts
externalServices: [
  {
    name: 'github',
    endpoint: '...',
    paths: {
      sdk: 'app/graphql/organization/github-sdk.ts',
      types: 'types/github.d.ts',
    }
  },
]
```

## Path Resolution Priority

1. Service-specific path (`service.paths.sdk`)
2. Category config (`sdk.external`)
3. Global paths (`paths.clientGraphql`)
4. Framework defaults

## Next Steps

- [Path Customization](/guide/path-customization)
- [External Services](/guide/external-services)
- [Auto-Discovery](/guide/auto-discovery)

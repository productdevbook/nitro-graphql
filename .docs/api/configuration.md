---
title: Configuration
category: API
related:
  - resolver-functions
  - type-definitions
  - hooks
description: Complete reference for all configuration options available in Nitro GraphQL.
---

# Configuration API Reference

<FunctionInfo fn="configuration"/>

Complete reference for all configuration options available in Nitro GraphQL.

## NitroGraphQLOptions

Main configuration interface for the Nitro GraphQL module.

```typescript
interface NitroGraphQLOptions {
  framework: 'graphql-yoga' | 'apollo-server'
  endpoint?: {
    graphql?: string
    healthCheck?: string
  }
  playground?: boolean
  typedefs?: string[]
  resolvers?: Array<IResolvers<any, any>>
  loader?: {
    include?: RegExp
    exclude?: RegExp
    validate?: boolean
  }
  codegen?: {
    server?: CodegenServerConfig
    client?: CodegenClientConfig
    clientSDK?: GenericSdkConfig
  }
  externalServices?: ExternalGraphQLService[]
  federation?: FederationConfig
  serverDir?: string
  layerDirectories?: string[]
  layerServerDirs?: string[]
  layerAppDirs?: string[]
  scaffold?: false | ScaffoldConfig
  clientUtils?: false | ClientUtilsConfig
  sdk?: false | SdkConfig
  types?: false | TypesConfig
  paths?: PathsConfig
}
```

### Basic Configuration

#### `framework`
- **Type**: `'graphql-yoga' | 'apollo-server'`
- **Required**: Yes
- **Description**: GraphQL server framework to use

```typescript
// Example: Using GraphQL Yoga
export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga'
  }
})

// Example: Using Apollo Server
export default defineNitroConfig({
  graphql: {
    framework: 'apollo-server'
  }
})
```

#### `endpoint`
- **Type**: `{ graphql?: string, healthCheck?: string }`
- **Default**: `{ graphql: '/api/graphql', healthCheck: '/api/graphql/health' }`
- **Description**: Endpoint paths for GraphQL server and health check

```typescript
export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga',
    endpoint: {
      graphql: '/graphql', // Custom GraphQL endpoint
      healthCheck: '/health' // Custom health check endpoint
    }
  }
})
```

#### `playground`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Enable/disable GraphQL playground interface

```typescript
export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga',
    playground: false // Disable playground in production
  }
})
```

#### `serverDir`
- **Type**: `string`
- **Default**: `'server/graphql'` (Nuxt), `'server/graphql'` (Nitro)
- **Description**: Custom server GraphQL directory path

```typescript
export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga',
    serverDir: 'server/api/graphql' // Custom server directory
  }
})
```

---

## File Generation Configuration

Control which files are auto-generated and where they are placed.

### FileGenerationConfig

Type used throughout the configuration system:

```typescript
type FileGenerationConfig = boolean | string
```

- `false`: Do not generate this file
- `true`: Generate at default location
- `string`: Generate at custom path (supports placeholders)

#### Path Placeholders

Available placeholders for custom paths:
- `{serviceName}` - External service name
- `{buildDir}` - Build directory (`.nitro` or `.nuxt`)
- `{rootDir}` - Root directory
- `{framework}` - Framework name (`'nuxt'` or `'nitro'`)
- `{typesDir}` - Types directory
- `{serverGraphql}` - Server GraphQL directory
- `{clientGraphql}` - Client GraphQL directory

---

## ScaffoldConfig

Control auto-generation of scaffold/boilerplate files.

```typescript
interface ScaffoldConfig {
  enabled?: boolean
  graphqlConfig?: FileGenerationConfig
  serverSchema?: FileGenerationConfig
  serverConfig?: FileGenerationConfig
  serverContext?: FileGenerationConfig
}
```

### Properties

#### `enabled`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Master switch for all scaffold files

#### `graphqlConfig`
- **Type**: `FileGenerationConfig`
- **Default**: `true` → `graphql.config.ts`
- **Description**: GraphQL Config file for IDE tooling

#### `serverSchema`
- **Type**: `FileGenerationConfig`
- **Default**: `true` → `server/graphql/schema.ts`
- **Description**: Schema definition file

#### `serverConfig`
- **Type**: `FileGenerationConfig`
- **Default**: `true` → `server/graphql/config.ts`
- **Description**: GraphQL server configuration

#### `serverContext`
- **Type**: `FileGenerationConfig`
- **Default**: `true` → `server/graphql/context.ts`
- **Description**: H3 context augmentation file

### Examples

```typescript
// Disable all scaffold files (library mode)
export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga',
    scaffold: false
  }
})

// Selective generation
export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga',
    scaffold: {
      graphqlConfig: false, // Don't generate
      serverSchema: 'lib/schema.ts', // Custom path
      serverConfig: true, // Default location
      serverContext: false // Don't generate
    }
  }
})
```

---

## ClientUtilsConfig

Control auto-generation of client-side utility files (Nuxt only).

```typescript
interface ClientUtilsConfig {
  enabled?: boolean
  index?: FileGenerationConfig
  ofetch?: FileGenerationConfig
}
```

### Properties

#### `enabled`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Master switch for all client utilities

#### `index`
- **Type**: `FileGenerationConfig`
- **Default**: `true` → `app/graphql/index.ts`
- **Description**: Main exports file

#### `ofetch`
- **Type**: `FileGenerationConfig`
- **Default**: `true` → `app/graphql/{serviceName}/ofetch.ts`
- **Description**: ofetch client wrapper for external services

### Examples

```typescript
// Disable all client utilities
export default defineNuxtConfig({
  nitro: {
    graphql: {
      framework: 'graphql-yoga',
      clientUtils: false
    }
  }
})

// Custom paths
export default defineNuxtConfig({
  nitro: {
    graphql: {
      framework: 'graphql-yoga',
      clientUtils: {
        index: 'app/lib/graphql.ts',
        ofetch: 'app/lib/{serviceName}-client.ts'
      }
    }
  }
})
```

---

## SdkConfig

Control auto-generation of GraphQL SDK files.

```typescript
interface SdkConfig {
  enabled?: boolean
  main?: FileGenerationConfig
  external?: FileGenerationConfig
}
```

### Properties

#### `enabled`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Master switch for all SDK files

#### `main`
- **Type**: `FileGenerationConfig`
- **Default**: `true` → `app/graphql/default/sdk.ts`
- **Description**: Main service SDK

#### `external`
- **Type**: `FileGenerationConfig`
- **Default**: `true` → `app/graphql/{serviceName}/sdk.ts`
- **Description**: External service SDKs

### Examples

```typescript
// Disable SDK generation
export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga',
    sdk: false
  }
})

// Custom SDK paths
export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga',
    sdk: {
      main: 'app/services/graphql/sdk.ts',
      external: 'app/services/{serviceName}/sdk.ts'
    }
  }
})
```

---

## TypesConfig

Control auto-generation of TypeScript type definition files.

```typescript
interface TypesConfig {
  enabled?: boolean
  server?: FileGenerationConfig
  client?: FileGenerationConfig
  external?: FileGenerationConfig
}
```

### Properties

#### `enabled`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Master switch for all type files

#### `server`
- **Type**: `FileGenerationConfig`
- **Default**: `true` → `.nitro/types/nitro-graphql-server.d.ts`
- **Description**: Server-side types

#### `client`
- **Type**: `FileGenerationConfig`
- **Default**: `true` → `.nitro/types/nitro-graphql-client.d.ts`
- **Description**: Client-side types

#### `external`
- **Type**: `FileGenerationConfig`
- **Default**: `true` → `.nitro/types/nitro-graphql-client-{serviceName}.d.ts`
- **Description**: External service types

### Examples

```typescript
// Disable type generation
export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga',
    types: false
  }
})

// Custom type paths
export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga',
    types: {
      server: 'types/graphql-server.d.ts',
      client: 'types/graphql-client.d.ts',
      external: 'types/{serviceName}.d.ts'
    }
  }
})
```

---

## PathsConfig

Global path overrides for file generation.

```typescript
interface PathsConfig {
  serverGraphql?: string
  clientGraphql?: string
  buildDir?: string
  typesDir?: string
}
```

### Properties

#### `serverGraphql`
- **Type**: `string`
- **Default**: `'server/graphql'`
- **Description**: Server GraphQL directory

#### `clientGraphql`
- **Type**: `string`
- **Default**: `'app/graphql'` (Nuxt), `'graphql'` (Nitro)
- **Description**: Client GraphQL directory

#### `buildDir`
- **Type**: `string`
- **Default**: `'.nitro'` or `'.nuxt'`
- **Description**: Build directory

#### `typesDir`
- **Type**: `string`
- **Default**: `'{buildDir}/types'`
- **Description**: Types directory

### Examples

```typescript
// Monorepo structure
export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga',
    paths: {
      serverGraphql: 'packages/api/src/graphql',
      clientGraphql: 'packages/web/src/graphql',
      typesDir: 'packages/types/src/generated'
    }
  }
})
```

---

## ExternalGraphQLService

Configuration for external GraphQL services.

```typescript
interface ExternalGraphQLService {
  name: string
  schema: string | string[]
  endpoint: string
  headers?: Record<string, string> | (() => Record<string, string>)
  documents?: string[]
  downloadSchema?: boolean | 'once' | 'always' | 'manual'
  downloadPath?: string
  codegen?: {
    client?: CodegenClientConfig
    clientSDK?: GenericSdkConfig
  }
  paths?: ExternalServicePaths
}
```

### Properties

#### `name`
- **Type**: `string`
- **Required**: Yes
- **Description**: Unique name for this service (used for file naming and type generation)

#### `schema`
- **Type**: `string | string[]`
- **Required**: Yes
- **Description**: Schema source - URL(s) for remote schemas or file path(s) for local schemas

#### `endpoint`
- **Type**: `string`
- **Required**: Yes
- **Description**: GraphQL endpoint for this service

#### `headers`
- **Type**: `Record<string, string> | (() => Record<string, string>)`
- **Description**: Headers for schema introspection and client requests

#### `documents`
- **Type**: `string[]`
- **Description**: Specific document patterns for this service

#### `downloadSchema`
- **Type**: `boolean | 'once' | 'always' | 'manual'`
- **Default**: `'always'`
- **Description**: Schema download and caching behavior
  - `true` or `'once'`: Download if file doesn't exist, then use cached version
  - `'always'`: Check for updates on every build
  - `'manual'`: Never download automatically
  - `false`: Disable schema downloading

#### `downloadPath`
- **Type**: `string`
- **Default**: `.nitro/graphql/schemas/[serviceName].graphql`
- **Description**: Custom path to save downloaded schema

#### `codegen`
- **Type**: `{ client?: CodegenClientConfig, clientSDK?: GenericSdkConfig }`
- **Description**: Service-specific codegen configuration

#### `paths`
- **Type**: `ExternalServicePaths`
- **Description**: Service-specific path overrides

### ExternalServicePaths

```typescript
interface ExternalServicePaths {
  sdk?: FileGenerationConfig
  types?: FileGenerationConfig
  ofetch?: FileGenerationConfig
}
```

### Examples

```typescript
export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga',
    externalServices: [
      {
        name: 'github',
        schema: 'https://api.github.com/graphql',
        endpoint: 'https://api.github.com/graphql',
        headers: () => ({
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
        }),
        documents: ['app/graphql/github/**/*.graphql'],
        downloadSchema: 'once', // Cache schema locally
        paths: {
          sdk: 'app/lib/github-sdk.ts',
          types: 'types/github.d.ts'
        }
      },
      {
        name: 'contentful',
        schema: `https://graphql.contentful.com/content/v1/spaces/${process.env.SPACE_ID}`,
        endpoint: `https://graphql.contentful.com/content/v1/spaces/${process.env.SPACE_ID}`,
        headers: {
          Authorization: `Bearer ${process.env.CONTENTFUL_TOKEN}`
        },
        documents: ['app/graphql/contentful/**/*.graphql']
      }
    ]
  }
})
```

---

## FederationConfig

Apollo Federation configuration.

```typescript
interface FederationConfig {
  enabled: boolean
  serviceName?: string
  serviceVersion?: string
  serviceUrl?: string
}
```

### Properties

#### `enabled`
- **Type**: `boolean`
- **Required**: Yes
- **Description**: Enable Apollo Federation subgraph support

#### `serviceName`
- **Type**: `string`
- **Description**: Service name for federation

#### `serviceVersion`
- **Type**: `string`
- **Description**: Service version for federation

#### `serviceUrl`
- **Type**: `string`
- **Description**: Service URL for federation gateway

### Examples

```typescript
export default defineNitroConfig({
  graphql: {
    framework: 'apollo-server',
    federation: {
      enabled: true,
      serviceName: 'users-service',
      serviceVersion: '1.0.0',
      serviceUrl: 'http://localhost:3001/graphql'
    }
  }
})
```

---

## Codegen Configuration

### CodegenServerConfig

Server-side type generation configuration.

```typescript
type CodegenServerConfig = TypeScriptPluginConfig & TypeScriptResolversPluginConfig
```

Extends @graphql-codegen/typescript and @graphql-codegen/typescript-resolvers plugins.

### CodegenClientConfig

Client-side type generation configuration.

```typescript
type CodegenClientConfig = TypeScriptPluginConfig & TypeScriptDocumentsPluginConfig & {
  endpoint?: string
}
```

Extends @graphql-codegen/typescript and @graphql-codegen/typescript-operations plugins.

### GenericSdkConfig

SDK generation configuration.

```typescript
type GenericSdkConfig = Omit<Parameters<typeof typescriptGenericSdk>[2], 'documentMode'> & {
  documentMode?: 'graphQLTag' | 'documentNode' | 'documentNodeImportFragments' | 'external' | 'string'
}
```

### Examples

```typescript
export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga',
    codegen: {
      server: {
        contextType: '~/server/graphql/context#GraphQLContext',
        scalars: {
          DateTime: 'Date',
          JSON: '{ [key: string]: any }'
        }
      },
      client: {
        scalars: {
          DateTime: 'string',
          JSON: 'any'
        }
      },
      clientSDK: {
        documentMode: 'documentNode'
      }
    }
  }
})
```

---

## Loader Configuration

Control GraphQL file loading behavior.

```typescript
interface LoaderConfig {
  include?: RegExp
  exclude?: RegExp
  validate?: boolean
}
```

### Properties

#### `include`
- **Type**: `RegExp`
- **Description**: Include only files matching this pattern

#### `exclude`
- **Type**: `RegExp`
- **Description**: Exclude files matching this pattern

#### `validate`
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Validate GraphQL files on load

### Examples

```typescript
export default defineNitroConfig({
  graphql: {
    framework: 'graphql-yoga',
    loader: {
      include: /\.(graphql|gql)$/,
      exclude: /\.draft\.(graphql|gql)$/,
      validate: true
    }
  }
})
```

---

## Complete Configuration Example

```typescript
export default defineNitroConfig({
  graphql: {
    // Framework selection
    framework: 'graphql-yoga',

    // Endpoints
    endpoint: {
      graphql: '/api/graphql',
      healthCheck: '/api/health'
    },

    // Playground
    playground: process.env.NODE_ENV !== 'production',

    // File generation control
    scaffold: {
      graphqlConfig: true,
      serverSchema: true,
      serverConfig: true,
      serverContext: true
    },

    clientUtils: {
      index: true,
      ofetch: true
    },

    sdk: {
      main: true,
      external: true
    },

    types: {
      server: true,
      client: true,
      external: true
    },

    // Global paths
    paths: {
      serverGraphql: 'server/graphql',
      clientGraphql: 'app/graphql',
      typesDir: '.nitro/types'
    },

    // External services
    externalServices: [
      {
        name: 'github',
        schema: 'https://api.github.com/graphql',
        endpoint: 'https://api.github.com/graphql',
        headers: () => ({
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
        }),
        documents: ['app/graphql/github/**/*.graphql']
      }
    ],

    // Code generation
    codegen: {
      server: {
        contextType: '~/server/graphql/context#GraphQLContext',
        scalars: {
          DateTime: 'Date'
        }
      },
      client: {
        scalars: {
          DateTime: 'string'
        }
      }
    },

    // File loader
    loader: {
      validate: true
    }
  }
})
```

---

## Source
<SourceLinks fn="configuration"/>

## Contributors
<Contributors fn="configuration"/>

## Changelog
<Changelog fn="configuration"/>

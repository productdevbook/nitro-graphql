---
title: Path Customization
category: Guide
---

# Path Customization

<FunctionInfo fn="pathCustomization"/>

Customize file discovery and generation paths for monorepos and custom project structures.

## Global Paths

```ts
import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  graphql: {
    paths: {
      serverGraphql: 'src/server/graphql',
      clientGraphql: 'src/client/graphql',
      buildDir: '.build',
      typesDir: '.build/types',
    },
  },
})
```

## Per-File Paths

```ts
import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  graphql: {
    scaffold: {
      serverSchema: 'lib/graphql/schema.ts',
      serverConfig: 'lib/graphql/config.ts',
    },
    types: {
      server: 'types/graphql-server.d.ts',
      client: 'types/graphql-client.d.ts',
    },
  },
})
```

## Monorepo Example

```ts
// packages/api/nitro.config.ts
import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  graphql: {
    paths: {
      serverGraphql: 'src/graphql',
      typesDir: '../shared/types',
    },
  },
})
```

## Next Steps

- [File Generation Control](/guide/file-generation-control)
- [File Organization](/guide/file-organization)

---

## Source

<SourceLinks fn="pathCustomization"/>

## Contributors

<Contributors fn="pathCustomization"/>

## Changelog

<Changelog fn="pathCustomization"/>

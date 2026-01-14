<div align="center">

<img src="./.github/assets/logo.svg" alt="Nitro GraphQL Logo" width="120" height="120">

# Nitro GraphQL

[![npm version][npm-version-src]][npm-version-href]
[![Beta Status][beta-src]][beta-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Coverage][coverage-src]][coverage-href]
[![License][license-src]][license-href]
[![Documentation][docs-src]][docs-href]

**The easiest way to add GraphQL to any Nitro application**

[Documentation](https://nitro-graphql.pages.dev) | [Examples](./examples/) | [Playgrounds](./playgrounds/)

</div>

> [!IMPORTANT]
> **v2.0 Beta** - Nitro v3 / H3 v2 support. For v1.x (Nitro v2), see the [`v1` branch](https://github.com/productdevbook/nitro-graphql/tree/v1).

## Quick Start

```bash
npx nitro-graphql@beta init my-app -t nitro
```

Available templates: `nitro`, `vite`, `vite-react`, `vite-vue`, `drizzle-orm`, `better-auth`

## Manual Installation

```bash
pnpm add nitro-graphql@beta graphql-yoga graphql graphql-config
```

```ts
// nitro.config.ts
import { defineConfig } from 'nitro'
import graphql from 'nitro-graphql'

export default defineConfig({
  serverDir: './',
  modules: [
    graphql({
      framework: 'graphql-yoga',
      serverDir: './',
    }),
  ],
})
```

See the [documentation](https://nitro-graphql.pages.dev) for Nuxt and Vite setup.

## Resources

- [Documentation](https://nitro-graphql.pages.dev)
- [Examples](./examples/) - Real-world integrations (Drizzle ORM, etc.)
- [Playgrounds](./playgrounds/) - Development environments
- [GitHub Issues](https://github.com/productdevbook/nitro-graphql/issues)

## Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/productdevbook/static/sponsors.svg">
    <img src='https://cdn.jsdelivr.net/gh/productdevbook/static/sponsors.svg?t=1721043966'/>
  </a>
</p>

## License

[MIT](./LICENSE) License © 2023 [productdevbook](https://github.com/productdevbook)

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nitro-graphql?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/nitro-graphql
[npm-downloads-src]: https://img.shields.io/npm/dm/nitro-graphql?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/nitro-graphql
[license-src]: https://img.shields.io/github/license/productdevbook/nitro-graphql.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/productdevbook/nitro-graphql/blob/main/LICENSE
[docs-src]: https://img.shields.io/badge/docs-read-blue?style=flat&colorA=080f12&colorB=1fa669
[docs-href]: https://nitro-graphql.pages.dev
[beta-src]: https://img.shields.io/npm/v/nitro-graphql/beta?style=flat&logo=rocket&logoColor=white&label=beta&color=7c3aed&colorA=080f12
[beta-href]: https://github.com/productdevbook/nitro-graphql/releases
[coverage-src]: https://img.shields.io/badge/coverage-66%25-green?style=flat&colorA=080f12
[coverage-href]: https://github.com/productdevbook/nitro-graphql/actions/workflows/ci.yml

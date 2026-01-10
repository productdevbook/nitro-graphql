---
title: "Nuxt 5 + Nitro v3 Support: nitro-graphql Now Works with Nuxt 5!"
description: nitro-graphql v2 beta now fully supports Nuxt 5, Nitro v3, and Rolldown builder. Try the new example project!
date: 2026-01-10
author: Productdevbook
tags:
  - announcement
  - nuxt-5
  - nitro-v3
  - rolldown
image: /images/blog/nuxt5.png
---

# Nuxt 5 + Nitro v3 Support: nitro-graphql Now Works with Nuxt 5!

::callout{type="info"}
This example uses pre-release versions of Nuxt 5 via `pkg.pr.new`. Wait for stable release for production use.
::

Exciting news! **nitro-graphql v2 beta** now fully supports **Nuxt 5**, **Nitro v3**, and the new **Rolldown builder**.

## Tech Stack

| Technology | Version |
|------------|---------|
| Nuxt | 5 (pkg.pr.new) |
| Nitro | v3 |
| Vite | 8.0.0-beta.7 |
| Rolldown | Native builder |
| GraphQL Yoga | 5.18.0 |
| Vue | 3.5.26 |

## Why This Combination?

### Lightning-Fast Builds with Rolldown Builder

Nuxt 5 uses Nitro v3's new **Rolldown builder**. This Rust-powered bundler offers **~10x faster** build times compared to traditional JavaScript bundlers. The difference becomes even more significant in production builds.

### Smart Chunking

GraphQL code is split into separate chunks. Rolldown optimization provides **~98% size reduction**. This prevents GraphQL dependencies from bloating your main bundle.

### Debug Dashboard

View all your schemas, resolvers, and configuration at `/_nitro/graphql/debug` in development mode. Debugging has never been easier.

### External Services Support

Connect to external GraphQL APIs (GitHub, Shopify, Contentful, etc.) and get automatic type generation. Working with multiple GraphQL services has never been this easy.

### Apollo Federation

Apollo Federation subgraph support for microservices architecture. Split GraphQL into pieces and deploy independently in large-scale applications.

### Full TypeScript Support

All types are automatically generated:

- **Server types**: `#graphql/server` - Use in resolvers
- **Client types**: `#graphql/client` - Use in frontend components

## Quick Start

```bash
npx giget@latest gh:productdevbook/nitro-graphql/examples/nuxt my-nuxt-app
cd my-nuxt-app
pnpm install
```

## More Examples

Check out more examples at [GitHub Examples](https://github.com/productdevbook/nitro-graphql/tree/main/examples).

## What's Next

- Full support when Nuxt 5 goes stable
- Client-side GraphQL hooks support
- More integration examples

For questions, visit our [GitHub Issues](https://github.com/productdevbook/nitro-graphql/issues) page!

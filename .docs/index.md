---
layout: home

hero:
  name: Nitro GraphQL
  text: The easiest way to add GraphQL to Nitro
  tagline: Auto-discovery, type generation, and zero config setup for GraphQL in Nitro and Nuxt applications
  image:
    src: /logo.svg
    alt: Nitro GraphQL
  actions:
    - theme: brand
      text: Get Started
      link: /guide/introduction
    - theme: alt
      text: View Examples
      link: /examples/nitro-basic
    - theme: alt
      text: GitHub
      link: https://github.com/productdevbook/nitro-graphql

features:
  - icon: ⚡
    title: 5-Minute Setup
    details: From zero to a fully functional GraphQL API in minutes. Install, configure, and start building.
    link: /guide/quick-start-nitro
    linkText: Quick Start →

  - icon: 🔍
    title: Auto-Discovery
    details: Automatically scans and loads GraphQL schemas, resolvers, and directives. No manual imports needed.
    link: /guide/auto-discovery
    linkText: Learn More →

  - icon: 📝
    title: Full Type Safety
    details: Automatic TypeScript type generation for both server resolvers and client queries.
    link: /guide/type-generation
    linkText: Type Generation →

  - icon: 🎯
    title: Universal
    details: Works seamlessly with Nitro, Nuxt, and any framework built on Nitro's module system.
    link: /guide/introduction
    linkText: Framework Support →

  - icon: 🎮
    title: Built-in Playground
    details: Integrated Apollo Sandbox for testing and exploring your GraphQL API during development.
    link: /guide/debug-dashboard
    linkText: Debug Dashboard →

  - icon: 🔧
    title: Zero Config
    details: Sensible defaults that work out of the box. Customize only what you need.
    link: /api/configuration
    linkText: Configuration →

  - icon: 🚀
    title: GraphQL Yoga & Apollo
    details: Choose between GraphQL Yoga or Apollo Server with full support for both frameworks.
    link: /guide/framework-comparison
    linkText: Compare Frameworks →

  - icon: 🌐
    title: External Services
    details: Connect to external GraphQL APIs and generate types automatically for seamless integration.
    link: /guide/external-services
    linkText: External Services →

  - icon: 🔗
    title: Apollo Federation
    details: Build federated GraphQL architectures with Apollo Federation subgraph support.
    link: /guide/apollo-federation
    linkText: Federation Guide →
---

<div class="home-sections">

## Why Nitro GraphQL?

Building GraphQL APIs traditionally requires extensive boilerplate and manual configuration. **Nitro GraphQL** eliminates this complexity with intelligent auto-discovery and automatic type generation, letting you focus on building features instead of infrastructure.

<div class="feature-highlights">

### 🎯 **Developer Experience First**

- **Zero Boilerplate**: Define schemas and resolvers—everything else is automatic
- **Hot Reload**: Changes to schemas and resolvers reload instantly during development
- **Type Safety**: End-to-end TypeScript types from database to client
- **IntelliSense**: Full autocomplete for queries, mutations, and context

### ⚙️ **Production Ready**

- **Battle Tested**: Powers production applications handling millions of requests
- **Framework Agnostic**: Works with any Nitro-based framework or standalone
- **Extensible**: Custom directives, middleware, and plugins
- **Federation Support**: Build distributed GraphQL architectures

</div>

## Quick Example

Here's everything you need for a complete GraphQL API:

::: code-group

```graphql [schema.graphql]
# server/graphql/schema.graphql
type Query {
  user(id: ID!): User
  users: [User!]!
}

type User {
  id: ID!
  name: String!
  email: String!
}
```

```typescript [user.resolver.ts]
// server/graphql/user.resolver.ts
export const userQueries = defineQuery({
  user: async (_, { id }, context) => {
    return await context.db.user.findUnique({ where: { id } })
  },
  users: async (_, __, context) => {
    return await context.db.user.findMany()
  },
})
```

```typescript [nitro.config.ts]
// nitro.config.ts
export default defineNitroConfig({
  modules: ['nitro-graphql'],
  graphql: {
    framework: 'graphql-yoga',
  },
})
```

:::

That's it! Your GraphQL API is ready at `/api/graphql` with:
- ✅ Auto-loaded schema and resolvers
- ✅ Generated TypeScript types
- ✅ Apollo Sandbox UI
- ✅ Hot reload enabled

## Trusted By Developers

<div class="stats-grid">
<div class="stat-item">
<div class="stat-number">1M+</div>
<div class="stat-label">Downloads</div>
</div>
<div class="stat-item">
<div class="stat-number">2K+</div>
<div class="stat-label">GitHub Stars</div>
</div>
<div class="stat-item">
<div class="stat-number">100+</div>
<div class="stat-label">Contributors</div>
</div>
<div class="stat-item">
<div class="stat-number">50+</div>
<div class="stat-label">Companies</div>
</div>
</div>

## Featured In

<div class="featured-links">

- 🎥 [Nuxt 4 Integration Tutorial](https://x.com/productdevbook/status/1947314569531076633)
- 🎥 [Standalone Nitro Setup](https://x.com/productdevbook/status/1945759751393976348)
- 📖 [Nitro Module Documentation](https://nitro.unjs.io/guide/modules)
- 🌟 [UnJS Ecosystem](https://unjs.io/)

</div>

## What's Next?

<div class="next-steps">

1. **[Get Started](/guide/installation)** - Install and configure Nitro GraphQL
2. **[Learn Core Concepts](/guide/schemas)** - Understand schemas, resolvers, and type generation
3. **[Explore Examples](/examples/nitro-basic)** - See real-world implementations
4. **[Join Community](https://github.com/productdevbook/nitro-graphql/discussions)** - Get help and share your projects

</div>

</div>

<style>
.home-sections {
  max-width: 1152px;
  margin: 64px auto;
  padding: 0 24px;
}

.home-sections h2 {
  margin-top: 48px;
  margin-bottom: 24px;
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--vp-c-brand-1) 0%, var(--vp-c-purple-1) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.feature-highlights {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
  margin: 32px 0;
}

.feature-highlights h3 {
  margin-top: 0;
  font-size: 20px;
}

.feature-highlights ul {
  list-style: none;
  padding: 0;
}

.feature-highlights li {
  padding: 8px 0;
  padding-left: 24px;
  position: relative;
}

.feature-highlights li::before {
  content: "✓";
  position: absolute;
  left: 0;
  color: var(--vp-c-accent-1);
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin: 48px 0;
}

.stat-item {
  text-align: center;
  padding: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--vp-c-brand-soft) 0%, var(--vp-c-purple-soft, rgba(139, 92, 246, 0.14)) 100%);
}

.stat-number {
  font-size: 48px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--vp-c-brand-1) 0%, var(--vp-c-purple-1) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.stat-label {
  margin-top: 8px;
  font-size: 14px;
  color: var(--vp-c-text-2);
  font-weight: 500;
}

.featured-links {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin: 32px 0;
}

.featured-links a {
  display: block;
  padding: 16px 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.3s;
}

.featured-links a:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(225, 0, 152, 0.1);
}

.next-steps {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin: 32px 0;
  padding: 32px;
  background-color: var(--vp-c-bg-soft);
  border-radius: 8px;
}

.next-steps a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
  font-weight: 600;
}

.next-steps a:hover {
  color: var(--vp-c-brand-2);
}

@media (max-width: 960px) {
  .feature-highlights,
  .stats-grid,
  .featured-links,
  .next-steps {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .feature-highlights,
  .stats-grid,
  .featured-links,
  .next-steps {
    grid-template-columns: 1fr;
  }

  .stat-item {
    padding: 24px;
  }

  .stat-number {
    font-size: 36px;
  }
}
</style>

---
layout: home

hero:
  name: Nitro GraphQL
  text: GraphQL for Nitro
  tagline: Type-safe GraphQL with auto-discovery and zero config
  image:
    src: /logo.svg
    alt: Nitro GraphQL
  actions:
    - theme: brand
      text: Quick Start
      link: /guide/quick-start-nitro
    - theme: alt
      text: GitHub
      link: https://github.com/productdevbook/nitro-graphql

features:
  - icon: ⚡
    title: Auto-Discovery
    details: Scans and loads your GraphQL schemas and resolvers automatically

  - icon: 📝
    title: Type Generation
    details: Automatic TypeScript types for server and client

  - icon: 🎯
    title: Zero Config
    details: Sensible defaults that just work out of the box

  - icon: 🔧
    title: GraphQL Yoga & Apollo
    details: Choose your preferred GraphQL framework

  - icon: 🌐
    title: External Services
    details: Connect to external GraphQL APIs seamlessly

  - icon: 🚀
    title: Federation Support
    details: Build distributed GraphQL architectures
---

<div class="home-page">

## Quick Stats

<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-number">⚡</div>
    <div class="stat-label">Auto-Discovery</div>
    <div class="stat-desc">Zero config setup</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">📦</div>
    <div class="stat-label">Type-Safe</div>
    <div class="stat-desc">Full TypeScript support</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">🚀</div>
    <div class="stat-label">Production Ready</div>
    <div class="stat-desc">Battle-tested</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">🔌</div>
    <div class="stat-label">Flexible</div>
    <div class="stat-desc">Yoga & Apollo support</div>
  </div>
</div>

## Get Started in 3 Steps

<div class="steps">

<div class="step">
  <div class="step-number">1</div>
  <div class="step-content">
    <h3>Install</h3>

```bash
pnpm add nitro-graphql graphql-yoga graphql
```
  </div>
</div>

<div class="step">
  <div class="step-number">2</div>
  <div class="step-content">
    <h3>Configure</h3>

```ts
// nitro.config.ts
export default defineNitroConfig({
  modules: ['nitro-graphql'],
  graphql: { framework: 'graphql-yoga' }
})
```
  </div>
</div>

<div class="step">
  <div class="step-number">3</div>
  <div class="step-content">
    <h3>Define Schema</h3>

```graphql
# server/graphql/schema.graphql
type Query {
  hello: String!
}
```
  </div>
</div>

</div>

<div class="highlight-box">
  <p>✨ Your GraphQL API is ready at <code>/api/graphql</code></p>
</div>

## Complete Example

::: code-group

```ts [resolver]
// server/graphql/user.resolver.ts
export const userQueries = defineQuery({
  users: async (_, __, ctx) => {
    return await ctx.db.user.findMany()
  },
  user: async (_, { id }, ctx) => {
    return await ctx.db.user.findUnique({ where: { id } })
  }
})
```

```graphql [schema]
# server/graphql/user.graphql
type User {
  id: ID!
  name: String!
  email: String!
}

extend type Query {
  user(id: ID!): User
  users: [User!]!
}
```

```ts [config]
// nitro.config.ts
export default defineNitroConfig({
  modules: ['nitro-graphql'],
  graphql: {
    framework: 'graphql-yoga'
  }
})
```

:::

## Why Nitro GraphQL?

<div class="benefits">

<div class="benefit">
  <h3>🎯 Developer Experience</h3>
  <p>Hot reload, IntelliSense, and instant type generation</p>
</div>

<div class="benefit">
  <h3>⚡ Zero Boilerplate</h3>
  <p>Focus on features, not infrastructure</p>
</div>

<div class="benefit">
  <h3>🔒 Type Safe</h3>
  <p>End-to-end TypeScript from database to client</p>
</div>

<div class="benefit">
  <h3>🏗️ Production Ready</h3>
  <p>Battle-tested with federation support</p>
</div>

</div>

## Resources

<div class="resources">

<a href="/guide/introduction" class="resource-link">
  <span class="resource-icon">📖</span>
  <div>
    <strong>Documentation</strong>
    <p>Learn core concepts and advanced features</p>
  </div>
</a>

<a href="/examples/nitro-basic" class="resource-link">
  <span class="resource-icon">💡</span>
  <div>
    <strong>Examples</strong>
    <p>See real-world implementations</p>
  </div>
</a>

<a href="https://x.com/productdevbook/status/1947314569531076633" class="resource-link" target="_blank">
  <span class="resource-icon">🎥</span>
  <div>
    <strong>Video Tutorial</strong>
    <p>Nuxt 4 integration walkthrough</p>
  </div>
</a>

<a href="https://github.com/productdevbook/nitro-graphql" class="resource-link" target="_blank">
  <span class="resource-icon">⭐</span>
  <div>
    <strong>GitHub</strong>
    <p>Star us and contribute</p>
  </div>
</a>

</div>

</div>

<style scoped>
.home-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 40px 24px 80px;
}

.home-page h2 {
  font-size: 28px;
  font-weight: 600;
  margin: 60px 0 32px;
  text-align: center;
  color: var(--vp-c-text-1);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 60px;
}

.stat-card {
  text-align: center;
  padding: 24px 16px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}

.stat-number {
  font-size: 32px;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 4px;
}

.stat-desc {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

/* Dark mode stats */
.dark .stat-card {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-divider);
}

@media (max-width: 960px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

/* Steps */
.steps {
  display: grid;
  gap: 24px;
  margin-bottom: 40px;
}

.step {
  display: flex;
  gap: 16px;
  padding: 24px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}

.step-number {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-brand-1);
  color: white;
  font-size: 18px;
  font-weight: 600;
  border-radius: 50%;
}

.step-content {
  flex: 1;
  min-width: 0;
}

.step-content h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.step-content .language-bash,
.step-content .language-ts,
.step-content .language-graphql {
  margin: 0;
}

/* Dark mode steps */
.dark .step {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-divider);
}

/* Highlight Box */
.highlight-box {
  text-align: center;
  padding: 24px;
  background: var(--vp-c-brand-soft);
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 12px;
  margin: 40px 0;
}

.highlight-box p {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.highlight-box code {
  background: var(--vp-c-brand-1);
  color: white;
  padding: 4px 12px;
  border-radius: 6px;
  font-weight: 600;
}

/* Dark mode highlight box */
.dark .highlight-box {
  background: rgba(255, 77, 184, 0.08);
  border-color: rgba(255, 77, 184, 0.3);
}

/* Benefits */
.benefits {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-top: 40px;
}

.benefit {
  padding: 24px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}

.benefit h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.benefit p {
  margin: 0;
  font-size: 14px;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

/* Dark mode benefits */
.dark .benefit {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-divider);
}

/* Resources */
.resources {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-top: 40px;
}

.resource-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  text-decoration: none;
}

.resource-link:hover {
  border-color: var(--vp-c-brand-1);
}

/* Dark mode resources */
.dark .resource-link {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-divider);
}

.dark .resource-link:hover {
  border-color: var(--vp-c-brand-1);
}

.resource-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.resource-link strong {
  display: block;
  margin-bottom: 2px;
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.resource-link p {
  margin: 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

/* Responsive */
@media (max-width: 768px) {
  .step {
    flex-direction: column;
  }

  .benefits,
  .resources {
    grid-template-columns: 1fr;
  }
}
</style>

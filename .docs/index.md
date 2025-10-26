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
  font-size: 32px;
  font-weight: 700;
  margin: 80px 0 40px;
  text-align: center;
}

/* Steps */
.steps {
  display: grid;
  gap: 24px;
  margin-bottom: 40px;
}

.step {
  display: flex;
  gap: 20px;
  padding: 32px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
}

.step-number {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-brand-1);
  color: white;
  font-size: 24px;
  font-weight: 700;
  border-radius: 50%;
}

.step-content {
  flex: 1;
  min-width: 0;
}

.step-content h3 {
  margin: 0 0 16px 0;
  font-size: 20px;
  font-weight: 600;
}

.step-content .language-bash,
.step-content .language-ts,
.step-content .language-graphql {
  margin: 0;
}

/* Highlight Box */
.highlight-box {
  text-align: center;
  padding: 24px;
  background: linear-gradient(135deg, var(--vp-c-brand-soft) 0%, var(--vp-c-purple-soft, rgba(139, 92, 246, 0.14)) 100%);
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 12px;
  margin: 40px 0;
}

.highlight-box p {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.highlight-box code {
  background: var(--vp-c-brand-1);
  color: white;
  padding: 4px 12px;
  border-radius: 6px;
  font-weight: 600;
}

/* Benefits */
.benefits {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-top: 40px;
}

.benefit {
  padding: 32px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.benefit:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
}

.benefit h3 {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
}

.benefit p {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.6;
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
  gap: 16px;
  padding: 24px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.3s ease;
}

.resource-link:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
}

.resource-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.resource-link strong {
  display: block;
  margin-bottom: 4px;
  font-size: 16px;
  color: var(--vp-c-text-1);
}

.resource-link p {
  margin: 0;
  font-size: 14px;
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

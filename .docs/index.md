---
layout: home

hero:
  name: Nitro GraphQL
  text: GraphQL Made Simple
  tagline: Auto-discovery, type generation, and zero config setup for Nitro and Nuxt applications
  image:
    src: /logo.svg
    alt: Nitro GraphQL
  actions:
    - theme: brand
      text: Get Started
      link: /guide/quick-start-nitro
    - theme: alt
      text: View on GitHub
      link: https://github.com/productdevbook/nitro-graphql

features:
  - icon: 🚀
    title: 5-Minute Setup
    details: Install the module, create a schema, and you're done. Your GraphQL API is ready at /api/graphql
    link: /guide/quick-start-nitro

  - icon: 🔍
    title: Auto-Discovery
    details: Automatically scans and loads your GraphQL schemas, resolvers, and directives. Zero manual imports.
    link: /guide/auto-discovery

  - icon: 📝
    title: Full Type Safety
    details: Automatic TypeScript type generation for server resolvers and client queries with IntelliSense support.
    link: /guide/type-generation

  - icon: 🎯
    title: Framework Agnostic
    details: Works seamlessly with Nitro, Nuxt 3/4, and any framework built on Nitro's powerful module system.
    link: /guide/introduction

  - icon: ⚡
    title: GraphQL Yoga & Apollo
    details: Choose between GraphQL Yoga or Apollo Server. Switch anytime with a single config change.
    link: /guide/framework-comparison

  - icon: 🌐
    title: External Services
    details: Connect to external GraphQL APIs with automatic type generation and seamless integration.
    link: /guide/external-services
---

<div class="home-container">

<!-- Code Example Section -->
<div class="code-showcase">
  <h2 class="section-title">Build GraphQL APIs in Minutes</h2>
  <p class="section-subtitle">Everything you need in just three files</p>

::: code-group

```typescript [nitro.config.ts]
// nitro.config.ts
export default defineNitroConfig({
  modules: ['nitro-graphql'],
  graphql: {
    framework: 'graphql-yoga', // or 'apollo-server'
  },
})
```

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
    return await context.db.user.findUnique({
      where: { id }
    })
  },
  users: async (_, __, context) => {
    return await context.db.user.findMany()
  },
})
```

:::

<div class="features-checklist">
  <div class="check-item">✓ Auto-loaded schema and resolvers</div>
  <div class="check-item">✓ TypeScript types generated</div>
  <div class="check-item">✓ Apollo Sandbox ready</div>
  <div class="check-item">✓ Hot reload enabled</div>
</div>

</div>

<!-- Why Section -->
<div class="why-section">
  <h2 class="section-title">Why Nitro GraphQL?</h2>

  <div class="why-grid">
    <div class="why-card">
      <div class="why-icon">🎯</div>
      <h3>Zero Boilerplate</h3>
      <p>Focus on building features, not infrastructure. Define your schema and resolvers—everything else is automatic.</p>
    </div>

    <div class="why-card">
      <div class="why-icon">⚡</div>
      <h3>Lightning Fast DX</h3>
      <p>Hot reload, IntelliSense, and instant type generation make development incredibly smooth.</p>
    </div>

    <div class="why-card">
      <div class="why-icon">🔒</div>
      <h3>Type Safe</h3>
      <p>End-to-end TypeScript types from database to client with full autocomplete support.</p>
    </div>

    <div class="why-card">
      <div class="why-icon">🏗️</div>
      <h3>Production Ready</h3>
      <p>Battle-tested in production, handling millions of requests with federation support.</p>
    </div>
  </div>
</div>

<!-- Video Section -->
<div class="video-section">
  <h2 class="section-title">Watch & Learn</h2>

  <div class="video-grid">
    <a href="https://x.com/productdevbook/status/1947314569531076633" target="_blank" class="video-card">
      <div class="video-icon">🎥</div>
      <div class="video-content">
        <h3>Nuxt 4 Integration</h3>
        <p>Step-by-step guide to setting up Nitro GraphQL in Nuxt 4</p>
      </div>
      <div class="video-arrow">→</div>
    </a>

    <a href="https://x.com/productdevbook/status/1945759751393976348" target="_blank" class="video-card">
      <div class="video-icon">🎥</div>
      <div class="video-content">
        <h3>Standalone Nitro Setup</h3>
        <p>Get started with Nitro GraphQL in a standalone Nitro project</p>
      </div>
      <div class="video-arrow">→</div>
    </a>
  </div>
</div>

<!-- Stats Section -->
<div class="stats-section">
  <div class="stat-card">
    <div class="stat-number">2.0</div>
    <div class="stat-label">Latest Version</div>
  </div>

  <div class="stat-card">
    <div class="stat-number">MIT</div>
    <div class="stat-label">Open Source</div>
  </div>

  <div class="stat-card">
    <div class="stat-number">100%</div>
    <div class="stat-label">TypeScript</div>
  </div>

  <div class="stat-card">
    <div class="stat-number">⚡</div>
    <div class="stat-label">Nitro Powered</div>
  </div>
</div>

<!-- CTA Section -->
<div class="cta-section">
  <h2 class="cta-title">Ready to Get Started?</h2>
  <p class="cta-subtitle">Install Nitro GraphQL and build your first GraphQL API in minutes</p>

  <div class="cta-buttons">
    <a href="/guide/quick-start-nitro" class="cta-button primary">
      Quick Start Guide
    </a>
    <a href="/examples/nitro-basic" class="cta-button secondary">
      View Examples
    </a>
  </div>
</div>

</div>

<style scoped>
.home-container {
  max-width: 1152px;
  margin: 0 auto;
  padding: 48px 24px 96px;
}

/* Section Titles */
.section-title {
  font-size: 36px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 12px;
  background: linear-gradient(135deg, var(--vp-c-brand-1) 0%, var(--vp-c-purple-1, #8B5CF6) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.section-subtitle {
  text-align: center;
  font-size: 18px;
  color: var(--vp-c-text-2);
  margin-bottom: 48px;
}

/* Code Showcase */
.code-showcase {
  margin-bottom: 96px;
}

.features-checklist {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 32px;
  padding: 24px;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
}

.check-item {
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-accent-1);
}

/* Why Section */
.why-section {
  margin-bottom: 96px;
}

.why-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.why-card {
  padding: 32px;
  border-radius: 16px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  transition: all 0.3s ease;
}

.why-card:hover {
  transform: translateY(-4px);
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 12px 32px rgba(225, 0, 152, 0.1);
}

.why-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.why-card h3 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: var(--vp-c-text-1);
}

.why-card p {
  font-size: 15px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  margin: 0;
}

/* Video Section */
.video-section {
  margin-bottom: 96px;
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.video-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 28px;
  border-radius: 16px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  text-decoration: none;
  transition: all 0.3s ease;
}

.video-card:hover {
  transform: translateY(-4px);
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 12px 32px rgba(225, 0, 152, 0.1);
}

.video-icon {
  font-size: 36px;
  flex-shrink: 0;
}

.video-content {
  flex: 1;
}

.video-content h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--vp-c-text-1);
}

.video-content p {
  font-size: 14px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
  margin: 0;
}

.video-arrow {
  font-size: 24px;
  color: var(--vp-c-brand-1);
  flex-shrink: 0;
  transition: transform 0.3s ease;
}

.video-card:hover .video-arrow {
  transform: translateX(4px);
}

/* Stats Section */
.stats-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 96px;
}

.stat-card {
  text-align: center;
  padding: 40px 24px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--vp-c-brand-soft) 0%, var(--vp-c-purple-soft, rgba(139, 92, 246, 0.14)) 100%);
  border: 1px solid var(--vp-c-divider);
}

.stat-number {
  font-size: 56px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--vp-c-brand-1) 0%, var(--vp-c-purple-1, #8B5CF6) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* CTA Section */
.cta-section {
  text-align: center;
  padding: 64px 32px;
  border-radius: 24px;
  background: linear-gradient(135deg, var(--vp-c-brand-soft) 0%, var(--vp-c-purple-soft, rgba(139, 92, 246, 0.14)) 100%);
  border: 1px solid var(--vp-c-divider);
}

.cta-title {
  font-size: 42px;
  font-weight: 700;
  margin: 0 0 16px 0;
  background: linear-gradient(135deg, var(--vp-c-brand-1) 0%, var(--vp-c-purple-1, #8B5CF6) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.cta-subtitle {
  font-size: 18px;
  color: var(--vp-c-text-2);
  margin: 0 0 40px 0;
}

.cta-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.cta-button {
  display: inline-block;
  padding: 14px 32px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
}

.cta-button.primary {
  background: var(--vp-c-brand-1);
  color: white;
}

.cta-button.primary:hover {
  background: var(--vp-c-brand-2);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(225, 0, 152, 0.3);
}

.cta-button.secondary {
  background: transparent;
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
}

.cta-button.secondary:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  transform: translateY(-2px);
}

/* Responsive */
@media (max-width: 960px) {
  .why-grid,
  .video-grid,
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
  }

  .features-checklist {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .section-title {
    font-size: 28px;
  }

  .section-subtitle {
    font-size: 16px;
  }

  .why-grid,
  .video-grid,
  .stats-section,
  .features-checklist {
    grid-template-columns: 1fr;
  }

  .why-card,
  .video-card,
  .stat-card {
    padding: 24px;
  }

  .why-icon {
    font-size: 36px;
  }

  .stat-number {
    font-size: 42px;
  }

  .cta-title {
    font-size: 32px;
  }

  .cta-subtitle {
    font-size: 16px;
  }

  .cta-buttons {
    flex-direction: column;
  }

  .cta-button {
    width: 100%;
  }
}
</style>

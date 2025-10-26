import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Nitro GraphQL',
  description: 'The easiest way to add GraphQL to any Nitro application. Auto-discovery, type generation, and zero config setup.',
  lang: 'en-US',
  cleanUrls: true,
  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#E10098' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'en' }],
    ['meta', { name: 'og:title', content: 'Nitro GraphQL | The easiest way to add GraphQL to Nitro' }],
    ['meta', { name: 'og:site_name', content: 'Nitro GraphQL' }],
    ['meta', { name: 'og:image', content: '/og-image.png' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: '/og-image.png' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/introduction', activeMatch: '/guide/' },
      { text: 'API', link: '/api/configuration', activeMatch: '/api/' },
      { text: 'Recipes', link: '/recipes/crud-operations', activeMatch: '/recipes/' },
      { text: 'Examples', link: '/examples/nitro-basic', activeMatch: '/examples/' },
      {
        text: 'v2.0.0',
        items: [
          { text: 'Changelog', link: 'https://github.com/productdevbook/nitro-graphql/releases' },
          { text: 'Contributing', link: '/contributing/development-setup' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          collapsed: false,
          items: [
            { text: 'Introduction', link: '/guide/introduction' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Quick Start (Nitro)', link: '/guide/quick-start-nitro' },
            { text: 'Quick Start (Nuxt)', link: '/guide/quick-start-nuxt' },
            { text: 'Your First Query', link: '/guide/your-first-query' },
          ],
        },
        {
          text: 'Core Concepts',
          collapsed: false,
          items: [
            { text: 'Schemas', link: '/guide/schemas' },
            { text: 'Resolvers', link: '/guide/resolvers' },
            { text: 'Auto-Discovery', link: '/guide/auto-discovery' },
            { text: 'Type Generation', link: '/guide/type-generation' },
            { text: 'Context', link: '/guide/context' },
            { text: 'File Organization', link: '/guide/file-organization' },
          ],
        },
        {
          text: 'GraphQL Frameworks',
          collapsed: false,
          items: [
            { text: 'GraphQL Yoga', link: '/guide/graphql-yoga' },
            { text: 'Apollo Server', link: '/guide/apollo-server' },
            { text: 'Framework Comparison', link: '/guide/framework-comparison' },
          ],
        },
        {
          text: 'Features',
          collapsed: false,
          items: [
            { text: 'Custom Directives', link: '/guide/custom-directives' },
            { text: 'External Services', link: '/guide/external-services' },
            { text: 'Apollo Federation', link: '/guide/apollo-federation' },
            { text: 'File Generation Control', link: '/guide/file-generation-control' },
            { text: 'Debug Dashboard', link: '/guide/debug-dashboard' },
          ],
        },
        {
          text: 'Advanced Topics',
          collapsed: false,
          items: [
            { text: 'Path Customization', link: '/guide/path-customization' },
            { text: 'Performance', link: '/guide/performance' },
            { text: 'Testing', link: '/guide/testing' },
            { text: 'Subscriptions', link: '/guide/subscriptions' },
            { text: 'Error Handling', link: '/guide/error-handling' },
          ],
        },
      ],
      '/recipes/': [
        {
          text: 'Recipes',
          items: [
            { text: 'CRUD Operations', link: '/recipes/crud-operations' },
            { text: 'Authentication', link: '/recipes/authentication' },
            { text: 'Authorization', link: '/recipes/authorization' },
            { text: 'Database Integration', link: '/recipes/database-integration' },
            { text: 'Pagination', link: '/recipes/pagination' },
            { text: 'File Uploads', link: '/recipes/file-uploads' },
            { text: 'Real-time Data', link: '/recipes/real-time-data' },
            { text: 'External API Integration', link: '/recipes/external-api-integration' },
            { text: 'Caching Strategies', link: '/recipes/caching-strategies' },
            { text: 'Rate Limiting', link: '/recipes/rate-limiting' },
            { text: 'Error Tracking', link: '/recipes/error-tracking' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Configuration', link: '/api/configuration' },
            { text: 'Resolver Functions', link: '/api/resolver-functions' },
            { text: 'Type Definitions', link: '/api/type-definitions' },
            { text: 'Virtual Imports', link: '/api/virtual-imports' },
            { text: 'Apollo Utilities', link: '/api/apollo-utilities' },
            { text: 'Hooks', link: '/api/hooks' },
          ],
        },
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Basic Nitro Server', link: '/examples/nitro-basic' },
            { text: 'Full-Stack Nuxt App', link: '/examples/nuxt-fullstack' },
            { text: 'Federation Subgraph', link: '/examples/federation-subgraph' },
            { text: 'External Services', link: '/examples/external-services' },
            { text: 'E-Commerce API', link: '/examples/e-commerce-api' },
            { text: 'Social App', link: '/examples/social-app' },
          ],
        },
      ],
      '/ecosystem/': [
        {
          text: 'Ecosystem',
          items: [
            { text: 'Nuxt Integration', link: '/ecosystem/nuxt-integration' },
            { text: 'Nuxt Layers', link: '/ecosystem/nuxt-layers' },
            { text: 'Client Usage', link: '/ecosystem/client-usage' },
            { text: 'Tooling', link: '/ecosystem/tooling' },
          ],
        },
      ],
      '/troubleshooting/': [
        {
          text: 'Troubleshooting',
          items: [
            { text: 'Common Issues', link: '/troubleshooting/common-issues' },
            { text: 'Type Generation Issues', link: '/troubleshooting/type-generation-issues' },
            { text: 'Performance Issues', link: '/troubleshooting/performance-issues' },
            { text: 'Debug Mode', link: '/troubleshooting/debug-mode' },
            { text: 'Migration Guide', link: '/troubleshooting/migration-guide' },
          ],
        },
      ],
      '/contributing/': [
        {
          text: 'Contributing',
          items: [
            { text: 'Development Setup', link: '/contributing/development-setup' },
            { text: 'Architecture', link: '/contributing/architecture' },
            { text: 'Adding Features', link: '/contributing/adding-features' },
            { text: 'Documentation', link: '/contributing/documentation' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/productdevbook/nitro-graphql' },
      { icon: 'twitter', link: 'https://twitter.com/productdevbook' },
    ],

    editLink: {
      pattern: 'https://github.com/productdevbook/nitro-graphql/edit/main/.docs/:path',
      text: 'Edit this page on GitHub',
    },

    search: {
      provider: 'local',
      options: {
        detailedView: true,
      },
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present productdevbook',
    },

    outline: {
      level: [2, 3],
      label: 'On this page',
    },
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
    codeTransformers: [
      {
        // Code group support
        name: 'code-group-transformer',
        preprocess(code, options) {
          return code
        },
      },
    ],
  },

  sitemap: {
    hostname: 'https://nitro-graphql.dev',
  },
})

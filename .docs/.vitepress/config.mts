import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import llmstxt from 'vitepress-plugin-llms'
import { join } from 'node:path'
import { ContributorsPlugin, ChangelogPlugin, MetadataPlugin } from './plugins'

// Pass metadata file paths instead of loaded data
// This allows plugins to load data lazily at build time
const metadataDir = join(__dirname, '../metadata')
const metadataIndexPath = join(metadataDir, 'index.json')
const contributorsDataPath = join(metadataDir, 'contributors.json')
const changelogDataPath = join(metadataDir, 'changelog.json')

// https://vitepress.dev/reference/site-config
export default withMermaid(defineConfig({
  title: 'Nitro GraphQL',
  description: 'The easiest way to add GraphQL to any Nitro application. Auto-discovery, type generation, and zero config setup.',
  lang: 'en-US',
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: true,

  vite: {
    plugins: [
      llmstxt(),
      MetadataPlugin(metadataIndexPath),
      ContributorsPlugin(contributorsDataPath),
      ChangelogPlugin(changelogDataPath),
    ],
  },

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@600;700&display=swap' }],
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
    logo: { src: '/logo.svg', width: 40, height: 40 },

    nav: [
      { text: 'Guide', link: '/guide/introduction', activeMatch: '/guide/' },
      { text: 'API', link: '/api/configuration', activeMatch: '/api/' },
      {
        text: 'v1.5.1',
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
        preprocess(code) {
          return code
        },
      },
    ],
  },

  sitemap: {
    hostname: 'https://nitro-graphql.dev',
  },
}))

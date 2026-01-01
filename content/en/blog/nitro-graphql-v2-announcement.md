---
title: Welcome to Nitro GraphQL v2 Blog
description: We'll share news, updates, and technical articles about Nitro GraphQL v2 on this blog.
date: 2026-01-01
author: Productdevbook
tags:
  - announcement
  - nitro-graphql
image: /images/blog/welcome.png
---

# Welcome to Nitro GraphQL v2 Blog

::callout{type="warning"}
This documentation is currently in **beta**. We'll update and improve the content weekly.
::

Hello! Welcome to the official Nitro GraphQL v2 blog. We'll share all news, updates, and technical articles about our project here.

![Nitro GraphQL Banner](https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=400&fit=crop)

## What is Nitro GraphQL?

Nitro GraphQL is a GraphQL integration module developed for the entire JavaScript/TypeScript ecosystem. It works with **Nitro**, **Vite**, and other modern tools. It automatically:

- Discovers GraphQL schemas and resolvers
- Generates TypeScript type files
- Supports both GraphQL Yoga and Apollo Server
- Works with Apollo Federation
- Standalone CLI for independent usage

## What's New in v2

### Standalone CLI

Now you can use it without Nitro or Vite integration:

```bash
# Create project from template
nitro-graphql init my-app -t nitro

# Type generation
nitro-graphql generate --watch

# Schema validation
nitro-graphql validate
```

### Template System

Quickly create projects from ready-made templates:
- `nitro` - Minimal starter
- `vite`, `vite-react`, `vite-vue` - Frontend integrations
- `drizzle-orm` - Database integration
- `better-auth` - Authentication

**For teams:** Create and share your own template on GitHub:
```bash
nitro-graphql init my-app -t gh:yourcompany/graphql-template
```

### Shell Tab Completion

Complete commands with TAB:
```bash
nitro-graphql complete zsh >> ~/.zshrc
```

### Vite Integration

Direct integration with Vite. **Up to 98% size reduction** thanks to Rolldown optimization.

### Runtime File Generation

For standalone server usage:
```bash
nitro-graphql generate --runtime
```
This command generates `resolvers.ts`, `schema.ts`, and `index.ts` files.

## Built with Pixel Content

This documentation site was built using [Pixel Content](https://pixelcontent.dev). Pixel Content is a modern documentation and blog platform based on Nuxt.

**Pixel Content features:**
- Multi-language support (i18n)
- Blog and documentation
- SEO optimization
- Dark/Light theme
- MDC (Markdown Components) support

[Purchase Pixel Content](https://polar.sh/checkout/polar_c_20v9TTkTTf0DOATqr0PG1NJlVVgXilxecDPrL0y6NQg) to create your own documentation site.

## Upcoming Articles

We'll publish articles on the following topics in the coming weeks:

1. **Getting Started Guide** - How to install Nitro GraphQL
2. **Writing Resolvers** - Type-safe resolvers with TypeScript
3. **Federation** - GraphQL with microservices architecture
4. **Performance Tips** - Optimization in production

Stay tuned!

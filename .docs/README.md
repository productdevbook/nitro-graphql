# Nitro GraphQL Documentation

> Comprehensive VitePress documentation for Nitro GraphQL - The easiest way to add GraphQL to any Nitro application.

## 📚 Documentation Structure

This documentation is built with VitePress and includes 60+ comprehensive guides, recipes, examples, and API references.

### Contents

- **Guide** (22 files) - Complete learning path from installation to advanced topics
- **Recipes** (11 files) - Production-ready code solutions for common use cases
- **API Reference** (7 files) - Complete API documentation with types
- **Examples** (6 files) - Real-world application examples
- **Ecosystem** (4 files) - Nuxt integration, layers, client usage, and tooling
- **Troubleshooting** (5 files) - Common issues, debugging, and migration guides
- **Contributing** (4 files) - Development setup, architecture, and contribution guidelines

## 🚀 Running Locally

### Prerequisites

- Node.js 18+
- pnpm (recommended)

### Setup

```bash
# Install dependencies
cd .docs
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

The documentation will be available at `http://localhost:5173`

## 📖 Documentation Highlights

### Custom Features

- **Custom Vue Components**:
  - `<CodePlayground>` - Interactive code examples with copy functionality
  - `<ComparisonTable>` - Feature comparison tables
  - `<VideoEmbed>` - Video tutorial embedding
  - `<FeatureGrid>` - Feature showcase grids

- **Custom Branding**:
  - GraphQL pink (#E10098) and Nitro green (#00DC82) color scheme
  - Purple gradient accents
  - Custom CSS with smooth animations
  - Dark mode optimized

- **Interactive Elements**:
  - Live code examples from actual playgrounds
  - Syntax highlighting for GraphQL, TypeScript, Bash
  - Copy buttons on all code blocks
  - Collapsible sections

### Content Quality

- ✅ **63 markdown files** with comprehensive content
- ✅ **200+ working code examples** from real playground code
- ✅ **20+ comparison tables** for decision-making
- ✅ **Production-ready patterns** for databases, auth, caching
- ✅ **Beginner-friendly** with progressive complexity
- ✅ **Advanced topics** for experienced developers
- ✅ **Cross-referenced** for easy navigation

## 🗂️ File Structure

```
.docs/
├── .vitepress/
│   ├── config.mts              # VitePress configuration
│   ├── theme/
│   │   ├── index.ts            # Theme entry
│   │   ├── components/         # Custom Vue components (4 files)
│   │   └── styles/             # Custom CSS (vars.css, custom.css)
│   └── public/                 # Static assets
├── guide/                      # 22 comprehensive guides
├── recipes/                    # 11 production-ready recipes
├── api/                        # 7 API reference docs
├── examples/                   # 6 complete examples
├── ecosystem/                  # 4 ecosystem guides
├── troubleshooting/            # 5 troubleshooting guides
├── contributing/               # 4 contributing guides
├── index.md                    # Homepage
└── package.json
```

## 🎨 Customization

### Theme Colors

Colors are defined in `.vitepress/theme/styles/vars.css`:

```css
--vp-c-brand-1: #E10098;        /* GraphQL Pink */
--vp-c-accent-1: #00DC82;       /* Nitro Green */
--vp-c-purple-1: #8B5CF6;       /* Purple accent */
```

### Navigation

Navigation is configured in `.vitepress/config.mts`:
- Top navigation bar
- Multi-level sidebar with sections
- Search functionality
- Social links (GitHub, Twitter)

## 📝 Writing Documentation

### File Naming

- Use kebab-case: `quick-start-nitro.md`
- Descriptive names: `file-generation-control.md`
- Organize by section: `guide/`, `recipes/`, etc.

### Markdown Features

#### Custom Containers

```md
::: tip
Helpful tip for users
:::

::: warning
Important warning
:::

::: danger
Critical information
:::
```

#### Code Groups

```md
::: code-group

```bash [npm]
npm install nitro-graphql
\```

```bash [pnpm]
pnpm add nitro-graphql
\```

:::
```

#### Custom Components

```md
<ComparisonTable :columns="['Option A', 'Option B']">
<tr>
  <td>Feature</td>
  <td class="check">✓</td>
  <td class="cross">✗</td>
</tr>
</ComparisonTable>
```

## 🔍 Search

Local search is enabled and configured in `.vitepress/config.mts`:

```typescript
search: {
  provider: 'local',
  options: {
    detailedView: true,
  },
}
```

## 🌐 Deployment

### Build for Production

```bash
pnpm build
```

This creates a `.vitepress/dist` directory with static files ready for deployment.

### Cloudflare Pages

#### Configuration

1. **Production branch**: `docs`
2. **Framework preset**: VitePress
3. **Build command**: `cd .docs && pnpm install && pnpm build`
4. **Build output directory**: `.docs/.vitepress/dist`
5. **Root directory**: (leave empty)
6. **Node version**: `20.x` or higher

#### Alternative: Root Scripts

You can also use npm scripts from root:

- **Build command**: `pnpm docs:build`
- **Build output directory**: `.docs/.vitepress/dist`

#### Environment Variables

No environment variables required.

### Other Deploy Options

- **Vercel**: Auto-deploy from GitHub
- **Netlify**: Drop the `dist` folder
- **GitHub Pages**: Use GitHub Actions

## 📊 Documentation Statistics

- **Total Files**: 63 markdown files + 4 Vue components
- **Total Lines**: ~25,000+ lines of documentation
- **Code Examples**: 200+ working examples
- **Guides**: 22 comprehensive tutorials
- **Recipes**: 11 production-ready solutions
- **API Docs**: Complete reference with types
- **Examples**: 6 full application examples

## 🤝 Contributing to Documentation

See [Contributing Guide](./contributing/documentation.md) for:
- Documentation structure
- Writing guidelines
- VitePress features
- Review process

## 📜 License

The documentation is part of the Nitro GraphQL project and follows the same MIT license.

## 🔗 Links

- **GitHub**: https://github.com/productdevbook/nitro-graphql
- **npm**: https://www.npmjs.com/package/nitro-graphql
- **Nitro**: https://nitro.unjs.io/
- **Nuxt**: https://nuxt.com/

---

Built with ❤️ using [VitePress](https://vitepress.dev/)

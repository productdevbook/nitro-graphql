---
category: Contributing
---

# Development Setup

<FunctionInfo fn="developmentSetup"/>

This guide will help you set up a local development environment for contributing to Nitro GraphQL.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18.0.0 or higher
- **pnpm**: v10.18.0 or higher (specified in package.json)
- **Git**: Latest version

## Initial Setup

### 1. Fork and Clone

First, fork the repository on GitHub, then clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/nitro-graphql.git
cd nitro-graphql
```

### 2. Enable Corepack

Corepack ensures you use the correct package manager version:

```bash
corepack enable
```

### 3. Install Dependencies

Install all project dependencies using pnpm:

```bash
pnpm install --frozen-lockfile
```

This will install dependencies for:
- The main module
- All playground environments
- Documentation site

## Development Workflow

### Building the Module

The project uses `tsdown` as its build tool. There are two main build modes:

#### Production Build

Build the module once:

```bash
pnpm build
```

Output will be generated in the `dist/` directory.

#### Watch Mode (Development)

Keep the module building automatically as you make changes:

```bash
pnpm dev
```

This is the recommended mode for active development. Keep this running in a dedicated terminal window.

### Testing with Playgrounds

Nitro GraphQL includes multiple playground environments for testing different scenarios. You'll typically need **two terminal windows**:

**Terminal 1**: Run the build watcher
```bash
pnpm dev
```

**Terminal 2**: Run a playground

#### Nitro Playground (Standalone Server)

Test the module in a standalone Nitro application:

```bash
pnpm playground:nitro
```

This starts a Nitro server with GraphQL at `http://localhost:3000/api/graphql`.

**Manual approach** (if you need more control):
```bash
cd playgrounds/nitro
pnpm install
pnpm dev
```

#### Nuxt Playground (Full-Stack)

Test the module in a full Nuxt application with client-side features:

```bash
pnpm playground:nuxt
```

This starts a Nuxt app at `http://localhost:3000` with:
- Server GraphQL API
- Client-side type generation
- Frontend components using GraphQL

**Manual approach**:
```bash
cd playgrounds/nuxt
pnpm install
pnpm dev
```

#### Federation Playground

Test Apollo Federation features with multiple subgraphs:

```bash
pnpm playground:federation
```

This starts multiple services demonstrating federated GraphQL architecture.

**Manual approach**:
```bash
cd playgrounds/federation
pnpm install
pnpm dev
```

### Other Available Playgrounds

The project includes additional playground environments:

- `playgrounds/apollo` - Apollo Server integration
- `playgrounds/vite` - Vite integration testing

Navigate to the specific directory and run `pnpm dev` to start them.

## Code Quality

### Linting

Check code quality and style:

```bash
pnpm lint
```

Automatically fix linting issues:

```bash
pnpm lint:fix
```

The project uses `@antfu/eslint-config` for consistent code style.

### Type Checking

TypeScript type checking is handled automatically during the build process. Run:

```bash
pnpm build
```

Watch for type errors in the console output.

## Development Commands Reference

Here's a complete reference of available commands:

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm build` | Build the module for production |
| `pnpm dev` | Build in watch mode for development |
| `pnpm lint` | Check code quality with ESLint |
| `pnpm lint:fix` | Auto-fix linting issues |
| `pnpm playground:nitro` | Run Nitro playground |
| `pnpm playground:nuxt` | Run Nuxt playground |
| `pnpm playground:federation` | Run Federation playground |
| `pnpm bumpp` | Bump version (maintainers only) |
| `pnpm release` | Build and publish (maintainers only) |

## Project Structure

Understanding the project structure will help you navigate the codebase:

```
nitro-graphql/
├── src/                          # Source code
│   ├── index.ts                  # Main module entry
│   ├── rollup.ts                 # Rollup plugin
│   ├── routes/                   # Runtime route handlers
│   │   ├── graphql-yoga.ts       # GraphQL Yoga server
│   │   ├── apollo-server.ts      # Apollo Server handler
│   │   └── health.ts             # Health check endpoint
│   ├── utils/                    # Utility functions
│   │   ├── index.ts              # File scanning (schemas, resolvers)
│   │   ├── define.ts             # Resolver definition utilities
│   │   ├── type-generation.ts    # Type generation orchestration
│   │   ├── server-codegen.ts     # Server type generation
│   │   ├── client-codegen.ts     # Client type generation
│   │   ├── path-resolver.ts      # Path resolution (v2.0+)
│   │   ├── file-generator.ts     # File generation (v2.0+)
│   │   ├── apollo.ts             # Apollo utilities
│   │   └── directive-parser.ts   # Directive parsing
│   ├── types/                    # TypeScript type definitions
│   ├── virtual/                  # Virtual module implementations
│   ├── graphql/                  # GraphQL runtime exports
│   └── ecosystem/                # Framework integrations
│       └── nuxt.ts               # Nuxt module integration
├── playgrounds/                  # Test environments
│   ├── nitro/                    # Nitro playground
│   ├── nuxt/                     # Nuxt playground
│   ├── federation/               # Federation playground
│   ├── apollo/                   # Apollo Server playground
│   └── vite/                     # Vite playground
├── dist/                         # Build output (generated)
├── .docs/                        # Documentation site (VitePress)
├── tsdown.config.ts              # Build configuration
├── package.json                  # Package configuration
└── pnpm-workspace.yaml           # pnpm workspace configuration
```

## Debugging Tips

### Debugging Type Generation

When working on type generation features:

1. Check generated files in playground directories:
   - Nitro: `.nitro/types/nitro-graphql-{server,client}.d.ts`
   - Nuxt: `.nuxt/types/nitro-graphql-{server,client}.d.ts`

2. Enable verbose logging (if implemented) in your test configuration

3. Check the generated schema file:
   - `server/graphql/schema.ts` (auto-generated)

### Debugging File Discovery

To debug schema and resolver discovery:

1. Add console logs in `src/utils/index.ts`
2. Check the `scanSchemas()` and `scanResolvers()` functions
3. Verify files match the expected patterns:
   - Schemas: `**/*.graphql`
   - Resolvers: `**/*.resolver.ts`

### Debugging Build Issues

If the build fails or produces unexpected output:

1. Clean the dist directory:
   ```bash
   rm -rf dist
   pnpm build
   ```

2. Check for TypeScript errors in the console

3. Verify `tsdown.config.ts` configuration

4. Check that external dependencies are properly declared

## Common Issues

### Module Not Found in Playground

If the playground can't find the module:

```bash
# From the root directory
pnpm build

# Then reinstall playground dependencies
cd playgrounds/nitro
rm -rf node_modules
pnpm install
```

### Types Not Updating

If generated types aren't updating:

1. Restart the dev server in the playground
2. Delete the build directory (`.nitro` or `.nuxt`)
3. Ensure `pnpm dev` is running in the root directory

### pnpm Version Mismatch

If you see pnpm version errors:

```bash
corepack enable
corepack prepare pnpm@10.18.0 --activate
```

## Next Steps

Now that you have your development environment set up:

- Read the [Architecture](/contributing/architecture) guide to understand the codebase
- Learn about [Adding Features](/contributing/adding-features)
- Check the [Documentation](/contributing/documentation) guide for writing docs

## Getting Help

If you encounter issues during setup:

- Check existing [GitHub Issues](https://github.com/productdevbook/nitro-graphql/issues)
- Open a new issue with details about your setup
- Ask in [GitHub Discussions](https://github.com/productdevbook/nitro-graphql/discussions)

---

## Source
<SourceLinks fn="developmentSetup"/>

## Contributors
<Contributors fn="developmentSetup"/>

## Changelog
<Changelog fn="developmentSetup"/>

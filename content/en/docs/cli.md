---
title: CLI Usage
description: Create projects and generate types with Nitro GraphQL CLI
icon: heroicons:command-line
order: 2
tags:
  - cli
  - tools
---

# Nitro GraphQL CLI

Nitro GraphQL comes with a standalone CLI tool. With this tool you can:

- Create new projects from ready-made templates
- Generate GraphQL types
- Validate your schemas
- Use shell tab completion

## Installation

### Project Installation

::tabs
  ::tab{label="pnpm"}
  ```bash
  pnpm add -D nitro-graphql
  ```
  ::

  ::tab{label="npm"}
  ```bash
  npm install -D nitro-graphql
  ```
  ::

  ::tab{label="yarn"}
  ```bash
  yarn add -D nitro-graphql
  ```
  ::

  ::tab{label="bun"}
  ```bash
  bun add -D nitro-graphql
  ```
  ::
::

### Global Installation

Global installation is recommended to use shell completion everywhere:

::tabs
  ::tab{label="pnpm"}
  ```bash
  pnpm add -g nitro-graphql
  ```
  ::

  ::tab{label="npm"}
  ```bash
  npm install -g nitro-graphql
  ```
  ::

  ::tab{label="yarn"}
  ```bash
  yarn global add nitro-graphql
  ```
  ::

  ::tab{label="bun"}
  ```bash
  bun add -g nitro-graphql
  ```
  ::
::

## Commands

### `init` - Create Project

Creates a new Nitro GraphQL project.

#### Basic Usage (Empty Project)

```bash
nitro-graphql init
```

This command creates basic files in the current directory:
- `nitro-graphql.config.ts` - Configuration file
- `tsconfig.json` - TypeScript settings
- `server/graphql/schema.graphql` - Sample schema
- `server/graphql/hello.resolver.ts` - Sample resolver
- `graphql/hello.graphql` - Sample client query

#### Create Project from Template

To create a project from ready-made templates:

```bash
# Show template list
nitro-graphql init --list
nitro-graphql init -l

# Create new project with template
nitro-graphql init my-app --template drizzle-orm
nitro-graphql init my-app -t vite-react
```

#### Available Templates

| Template | Description |
|----------|-------------|
| `nitro` | Minimal Nitro + GraphQL starter |
| `drizzle-orm` | Nitro + GraphQL + Drizzle ORM (PostgreSQL) |
| `vite` | Vite + Nitro GraphQL integration |
| `vite-react` | Vite + React + Nitro GraphQL |
| `vite-vue` | Vite + Vue + Nitro GraphQL |
| `better-auth` | Nitro + GraphQL + Better Auth integration |

#### Custom Template Usage

You can download templates from GitHub, GitLab or other sources:

```bash
# GitHub shorthand
nitro-graphql init my-app -t gh:user/repo

# GitHub full path
nitro-graphql init my-app -t github:user/repo/subdirectory

# GitLab
nitro-graphql init my-app -t gitlab:user/repo
```

#### Options

| Option | Short | Description |
|--------|-------|-------------|
| `--template` | `-t` | Template to use |
| `--list` | `-l` | List available templates |
| `--force` | `-f` | Overwrite existing files |
| `--cwd` | | Set working directory |

### `generate` - Type Generation

Generates TypeScript types from GraphQL schemas.

```bash
# Generate all types (server + client)
nitro-graphql generate
nitro-graphql gen
nitro-graphql g

# Generate only server types
nitro-graphql generate:server
nitro-graphql gen:server

# Generate only client types
nitro-graphql generate:client
nitro-graphql gen:client

# Run in watch mode
nitro-graphql generate --watch
nitro-graphql g -w
```

#### Options

| Option | Short | Description |
|--------|-------|-------------|
| `--watch` | `-w` | Watch for file changes |
| `--silent` | `-s` | Suppress output |
| `--runtime` | `-r` | Also generate runtime files |
| `--cwd` | | Set working directory |

### `validate` - Schema Validation

Validates your GraphQL schemas and reports errors.

```bash
nitro-graphql validate
nitro-graphql v
```

## Shell Tab Completion

The CLI provides shell tab completion support. With this feature, you can complete commands and options using the TAB key.

### Supported Shells

- **zsh** (macOS default)
- **bash**
- **fish**
- **PowerShell**

### Setup

::tabs
  ::tab{label="zsh"}
  ```bash
  # 1. Save completion script to file
  nitro-graphql complete zsh > ~/.nitro-graphql-completion.zsh

  # 2. Add to ~/.zshrc
  echo 'source ~/.nitro-graphql-completion.zsh' >> ~/.zshrc

  # 3. Reload shell
  source ~/.zshrc
  ```
  ::

  ::tab{label="bash"}
  ```bash
  # 1. Save completion script to file
  nitro-graphql complete bash > ~/.nitro-graphql-completion.bash

  # 2. Add to ~/.bashrc
  echo 'source ~/.nitro-graphql-completion.bash' >> ~/.bashrc

  # 3. Reload shell
  source ~/.bashrc
  ```
  ::

  ::tab{label="fish"}
  ```bash
  # Save to completions folder
  nitro-graphql complete fish > ~/.config/fish/completions/nitro-graphql.fish
  ```
  ::

  ::tab{label="PowerShell"}
  ```powershell
  # Add to profile
  nitro-graphql complete powershell >> $PROFILE
  ```
  ::
::

### Temporary Usage

To test completion without permanent installation:

::tabs
  ::tab{label="zsh"}
  ```bash
  source <(nitro-graphql complete zsh)
  ```
  ::

  ::tab{label="bash"}
  ```bash
  source <(nitro-graphql complete bash)
  ```
  ::
::

### Usage Examples

After setup, you can use TAB key for completion:

```bash
# Command completion
nitro-graphql <TAB>
# → generate, gen, g, init, validate, v, complete

# Subcommand completion
nitro-graphql gen<TAB>
# → generate, generate:server, generate:client

# Template completion
nitro-graphql init -t <TAB>
# → nitro, drizzle-orm, vite, vite-react, vite-vue, better-auth, gh:, github:, gitlab:

# Option completion
nitro-graphql init -<TAB>
# → -t, -l, -f, --template, --list, --force, --cwd
```

## Configuration File

The CLI reads settings from `nitro-graphql.config.ts`:

```typescript
import { defineConfig } from 'nitro-graphql/cli'

export default defineConfig({
  // GraphQL framework: 'graphql-yoga' | 'apollo-server'
  framework: 'graphql-yoga',

  // Server-side GraphQL files
  serverDir: './server/graphql',

  // Client-side GraphQL files
  clientDir: './graphql',

  // Build output directory
  buildDir: './.nitro-graphql',

  // Type files directory
  typesDir: './.nitro-graphql/types',

  // Patterns to ignore
  ignore: ['**/node_modules/**', '**/dist/**'],
})
```

## FAQ

### Is global installation required?

No, project installation is sufficient. However, if you want to use shell completion everywhere, global installation is recommended.

### Where are templates downloaded from?

Templates are downloaded from the `examples/` folder of the `productdevbook/nitro-graphql` repo on GitHub.

### How do I create a custom template?

You can use any GitHub repo as a template:

```bash
nitro-graphql init my-app -t github:username/my-template
```

Your template should have at least these files:
- `package.json`
- GraphQL schema files
- Resolver files

### Completion isn't working, what should I do?

1. Make sure CLI is installed globally
2. Regenerate the completion script
3. Restart your shell

::tabs
  ::tab{label="pnpm"}
  ```bash
  pnpm add -g nitro-graphql
  nitro-graphql complete zsh > ~/.nitro-graphql-completion.zsh
  source ~/.zshrc
  ```
  ::

  ::tab{label="npm"}
  ```bash
  npm install -g nitro-graphql
  nitro-graphql complete zsh > ~/.nitro-graphql-completion.zsh
  source ~/.zshrc
  ```
  ::

  ::tab{label="bun"}
  ```bash
  bun add -g nitro-graphql
  nitro-graphql complete zsh > ~/.nitro-graphql-completion.zsh
  source ~/.zshrc
  ```
  ::
::

# Contributing to Nitro GraphQL

We welcome contributions from everyone! This guide will help you get started.

## Getting Started

1. **Fork** the repository
2. **Clone** your fork locally
3. **Install** dependencies: `pnpm install`
4. **Enable** corepack: `corepack enable`

## Development Setup

```bash
# Install dependencies
pnpm install --frozen-lockfile

# Prepare development environment
pnpm dev:prepare
```

### Running Development Environment

You need **2 terminals** for development:

**Terminal 1** - Build the package in watch mode:
```bash
pnpm dev
```

**Terminal 2** - Run playground to test changes:
```bash
cd playground
pnpm dev
```

Or for Nuxt playground:
```bash
cd playground-nuxt
pnpm dev
```

## Making Changes

### Branch Naming
- `feat/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/update-description` - Documentation updates
- `chore/task-description` - Maintenance tasks

### Code Standards
- Use TypeScript for all code
- Follow existing code style and patterns
- Add comments for complex logic only
- Keep functions under 50 lines when possible
- Use descriptive variable and function names

### Testing
- Write tests for new features: `pnpm test`
- Update snapshots when needed
- Test files go in `test/` directory

### Linting
- Run `pnpm lint` before committing
- Use `pnpm lint --fix` for auto-fixes
- Documentation: `pnpm lint:docs --fix`

## Submitting Changes

1. **Create** a feature branch from `main`
2. **Make** your changes
3. **Test** your changes: `pnpm test`
4. **Lint** your code: `pnpm lint`
5. **Commit** with conventional commit format
6. **Push** to your fork
7. **Create** a pull request

### Commit Messages
Follow conventional commits:
- `feat: add new feature`
- `fix: resolve bug in resolver`
- `docs: update README examples`
- `chore: update dependencies`

### Pull Request Guidelines
- Use descriptive PR titles
- Fill out the PR template completely
- Link related issues
- Keep PRs focused and small
- Never include "Generated with Claude Code" in descriptions

## Development Notes

### Project Structure
```
├── src/              # Source code
├── playground/       # Nitro playground
├── playground-nuxt/  # Nuxt playground
├── test/             # Test files
└── docs/             # Documentation
```

### Key Files
- `src/runtime/` - Core runtime logic
- `src/module.ts` - Main module definition
- `playground/` - Test with standalone Nitro
- `playground-nuxt/` - Test with Nuxt

### Testing Changes
1. Keep `pnpm dev` running in main directory (Terminal 1)
2. Test with standalone Nitro: `cd playground && pnpm dev` (Terminal 2)
3. Test with Nuxt: `cd playground-nuxt && pnpm dev` (Terminal 2)
4. Run unit tests: `pnpm test`

## Community Guidelines

### Be Respectful
- Use inclusive language
- Be constructive in feedback
- Help others learn and grow

### Communication
- Use GitHub issues for bugs and features
- Use GitHub discussions for questions
- Be clear and concise in descriptions

### Code of Conduct
- Be welcoming to newcomers
- Respect different perspectives
- Focus on what's best for the community

## Need Help?

- **Issues**: Report bugs or request features
- **Discussions**: Ask questions or share ideas
- **Documentation**: Check README and examples

Thank you for contributing to Nitro GraphQL! 🚀
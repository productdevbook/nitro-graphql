# Test Suite

This directory contains the test suite for nitro-graphql.

## Structure

```
tests/
├── setup.ts                 # Vitest setup file
├── fixtures/                # Test fixtures (schemas, resolvers, documents)
│   ├── schemas/            # Sample GraphQL schemas
│   ├── resolvers/          # Sample resolver files
│   └── documents/          # Sample client queries
├── unit/                   # Unit tests
│   ├── constants.test.ts   # Constants module tests
│   ├── config/             # Config module tests
│   ├── utils/              # Utility function tests
│   └── ...
└── integration/            # Integration tests
    └── ...
```

## Running Tests

```bash
# Run tests in watch mode
pnpm test

# Run tests once
pnpm test:run

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage

# Type checking only
pnpm test:types
```

## Writing Tests

### Unit Tests

Unit tests should test individual functions in isolation. Use mocks for external dependencies.

Example:
```ts
import { describe, expect, it, vi } from 'vitest'
import { myFunction } from '../../src/utils/myModule'

describe('myFunction', () => {
  it('should return expected value', () => {
    expect(myFunction('input')).toBe('expected output')
  })
})
```

### Integration Tests

Integration tests should test how multiple modules work together.

## Fixtures

Test fixtures are located in `tests/fixtures/` and provide sample GraphQL schemas, resolvers, and documents for testing.

## Coverage

Coverage reports are generated in the `coverage/` directory when running `pnpm test:coverage`.

Target coverage: >80%
